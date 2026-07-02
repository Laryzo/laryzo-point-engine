import { serviceClient, requireAdmin } from '../_shared/auth.ts'

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

function determinePpobType(category: string): string {
  const cat = category.toLowerCase()
  if (cat.includes('pulsa') || cat.includes('data')) return 'pulsa'
  if (cat.includes('e-money') || cat.includes('ewallet') || cat.includes('e-wallet') || cat.includes('dompet')) return 'emoney'
  if (cat.includes('pln') || cat.includes('listrik') || cat.includes('token')) return 'token_pln'
  if (cat.includes('game') || cat.includes('voucher')) return 'game'
  return 'pulsa'
}

function determineRequiresInput(category: string): string {
  const cat = category.toLowerCase()
  if (cat.includes('pln') || cat.includes('listrik') || cat.includes('token')) return 'meter_id'
  return 'phone'
}

function calculatePointPrice(costPrice: number): number {
  return Math.ceil((costPrice + 1000) / 500) * 500
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  // AUTH: bulk product import is admin-only.
  const admin = await requireAdmin(req)
  if (!admin) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const supabase = serviceClient()

    const body: ImportRequest = await req.json()
    const { skus = [], mode = 'selected', filters } = body

    console.log(`Import request: mode=${mode}, skus=${skus.length}, filters=`, filters)

    let query = supabase
      .from('digiflazz_price_cache')
      .select('*')

    if (mode === 'selected' && skus.length > 0) {
      query = query.in('buyer_sku_code', skus)
    }
    if (filters?.category) query = query.eq('category', filters.category)
    if (filters?.brand) query = query.eq('brand', filters.brand)

    query = query.eq('buyer_product_status', true)

    const { data: cacheProducts, error: cacheError } = await query
    if (cacheError) throw cacheError

    if (!cacheProducts || cacheProducts.length === 0) {
      return new Response(JSON.stringify({
        success: true, imported: 0, skipped: 0,
        message: 'Tidak ada produk yang ditemukan di cache'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: existingProducts, error: existingError } = await supabase
      .from('products')
      .select('digiflazz_sku')
      .eq('type', 'ppob')
      .not('digiflazz_sku', 'is', null)
    if (existingError) throw existingError

    const existingSkus = new Set((existingProducts || []).map(p => p.digiflazz_sku))
    const newProducts = cacheProducts.filter(p => !existingSkus.has(p.buyer_sku_code))
    const skippedCount = cacheProducts.length - newProducts.length

    if (newProducts.length === 0) {
      return new Response(JSON.stringify({
        success: true, imported: 0, skipped: skippedCount,
        message: `Semua ${skippedCount} produk sudah ada di database`
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const productsToInsert = newProducts.map(p => ({
      name: p.product_name,
      description: p.description || null,
      type: 'ppob',
      ppob_type: determinePpobType(p.category),
      digiflazz_sku: p.buyer_sku_code,
      cost_price: p.price,
      point_price: calculatePointPrice(p.price),
      stock: -1,
      is_active: false,
      requires_shipping: false,
      requires_input: determineRequiresInput(p.category),
      image_url: null
    }))

    const batchSize = 50
    let totalInserted = 0
    const errors: string[] = []

    for (let i = 0; i < productsToInsert.length; i += batchSize) {
      const batch = productsToInsert.slice(i, i + batchSize)
      const { error: insertError } = await supabase.from('products').insert(batch)
      if (insertError) {
        errors.push(`Batch ${i / batchSize + 1}: ${insertError.message}`)
      } else {
        totalInserted += batch.length
      }
    }

    return new Response(JSON.stringify({
      success: true,
      imported: totalInserted,
      skipped: skippedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Berhasil import ${totalInserted} produk${skippedCount > 0 ? `, ${skippedCount} sudah ada` : ''}`
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error: any) {
    console.error('Import error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Unknown error'
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
