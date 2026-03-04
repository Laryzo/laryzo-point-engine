import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface DigiflazzProduct {
  buyer_sku_code: string
  product_name: string
  category: string
  brand: string
  price: number
  type: string
  description: string | null
  buyer_product_status: boolean
  seller_product_status: boolean
}

interface ImportRequest {
  skus: string[]
  mode?: 'selected' | 'all'
  filters?: {
    category?: string
    brand?: string
  }
}

// Determine ppob_type based on category
function determinePpobType(category: string): string {
  const cat = category.toLowerCase()
  
  if (cat.includes('pulsa') || cat.includes('data')) {
    return 'pulsa'
  }
  if (cat.includes('e-money') || cat.includes('ewallet') || cat.includes('e-wallet') || cat.includes('dompet')) {
    return 'emoney'
  }
  if (cat.includes('pln') || cat.includes('listrik') || cat.includes('token')) {
    return 'token_pln'
  }
  if (cat.includes('game') || cat.includes('voucher')) {
    return 'game'
  }
  
  // Default to pulsa for unknown categories
  return 'pulsa'
}

// Determine requires_input based on category
function determineRequiresInput(category: string): string {
  const cat = category.toLowerCase()
  
  if (cat.includes('pln') || cat.includes('listrik') || cat.includes('token')) {
    return 'meter_id'
  }
  
  // Most other products require phone number
  return 'phone'
}

// Calculate point_price with margin formula: Math.ceil((cost + 1000) / 500) * 500
function calculatePointPrice(costPrice: number): number {
  return Math.ceil((costPrice + 1000) / 500) * 500
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Parse request body
    const body: ImportRequest = await req.json()
    const { skus = [], mode = 'selected', filters } = body

    console.log(`Import request: mode=${mode}, skus=${skus.length}, filters=`, filters)

    // Build query to get products from cache
    let query = supabase
      .from('digiflazz_price_cache')
      .select('*')

    // Apply filters
    if (mode === 'selected' && skus.length > 0) {
      query = query.in('buyer_sku_code', skus)
    }
    if (filters?.category) {
      query = query.eq('category', filters.category)
    }
    if (filters?.brand) {
      query = query.eq('brand', filters.brand)
    }

    // Only active products
    query = query.eq('buyer_product_status', true)

    const { data: cacheProducts, error: cacheError } = await query

    if (cacheError) {
      console.error('Error fetching from cache:', cacheError)
      throw cacheError
    }

    if (!cacheProducts || cacheProducts.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        imported: 0,
        skipped: 0,
        message: 'Tidak ada produk yang ditemukan di cache'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`Found ${cacheProducts.length} products in cache`)

    // Get existing SKUs from products table
    const { data: existingProducts, error: existingError } = await supabase
      .from('products')
      .select('digiflazz_sku')
      .eq('type', 'ppob')
      .not('digiflazz_sku', 'is', null)

    if (existingError) {
      console.error('Error fetching existing products:', existingError)
      throw existingError
    }

    const existingSkus = new Set((existingProducts || []).map(p => p.digiflazz_sku))
    console.log(`Found ${existingSkus.size} existing PPOB products`)

    // Filter out already existing products
    const newProducts = cacheProducts.filter(p => !existingSkus.has(p.buyer_sku_code))
    const skippedCount = cacheProducts.length - newProducts.length

    console.log(`New products to import: ${newProducts.length}, skipped: ${skippedCount}`)

    if (newProducts.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        imported: 0,
        skipped: skippedCount,
        message: `Semua ${skippedCount} produk sudah ada di database`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Prepare products for insertion
    const productsToInsert = newProducts.map(p => ({
      name: p.product_name,
      description: p.description || null,
      type: 'ppob',
      ppob_type: determinePpobType(p.category),
      digiflazz_sku: p.buyer_sku_code,
      cost_price: p.price,
      point_price: calculatePointPrice(p.price),
      stock: -1, // Unlimited for PPOB
      is_active: false, // Default inactive, admin must activate
      requires_shipping: false,
      requires_input: determineRequiresInput(p.category),
      image_url: null
    }))

    // Insert in batches of 50
    const batchSize = 50
    let totalInserted = 0
    const errors: string[] = []

    for (let i = 0; i < productsToInsert.length; i += batchSize) {
      const batch = productsToInsert.slice(i, i + batchSize)
      
      const { error: insertError } = await supabase
        .from('products')
        .insert(batch)

      if (insertError) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError)
        errors.push(`Batch ${i / batchSize + 1}: ${insertError.message}`)
      } else {
        totalInserted += batch.length
        console.log(`Inserted batch ${i / batchSize + 1}: ${batch.length} products`)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      imported: totalInserted,
      skipped: skippedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Berhasil import ${totalInserted} produk${skippedCount > 0 ? `, ${skippedCount} sudah ada` : ''}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Import error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
