import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHash } from 'node:crypto'

// CORS configuration - restrict to trusted origins
const ALLOWED_ORIGINS = [
  'https://lovable.dev',
  'https://jkqtqxwtyqrlhblnaohz.lovableproject.com',
  'https://laryzo.biz.id',
  'http://localhost:5173',
  'http://localhost:3000',
]

// Cache settings - refresh every 6 hours
const CACHE_DURATION_MS = 6 * 60 * 60 * 1000

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || origin.endsWith('.lovable.dev') || origin.endsWith('.lovableproject.com') || origin.endsWith('.lovable.app')
  )
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  }
}

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false
  return ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || origin.endsWith('.lovable.dev') || origin.endsWith('.lovableproject.com') || origin.endsWith('.lovable.app')
  )
}

interface DigiflazzPriceItem {
  product_name: string
  category: string
  brand: string
  type: string
  seller_name: string
  price: number
  buyer_sku_code: string
  buyer_product_status: boolean
  seller_product_status: boolean
  unlimited_stock: boolean
  stock: number
  multi: boolean
  start_cut_off: string
  end_cut_off: string
  desc: string
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Validate origin for non-preflight requests
  if (!isOriginAllowed(origin)) {
    console.warn('Blocked digiflazz-price-list request from unauthorized origin:', origin)
    return new Response(
      JSON.stringify({ error: 'Origin not allowed' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const { cmd = 'prepaid', force = false } = await req.json().catch(() => ({}))
    const cmdType = cmd === 'pasca' ? 'pasca' : 'prepaid'

    // Check cache freshness
    const { data: lastSyncSetting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'digiflazz_last_sync')
      .single()

    const lastSyncTime = lastSyncSetting?.value ? new Date(lastSyncSetting.value).getTime() : 0
    const now = Date.now()
    const cacheExpired = (now - lastSyncTime) > CACHE_DURATION_MS

    // If cache is fresh and not forcing refresh, return cached data
    if (!cacheExpired && !force) {
      console.log('Returning cached price list...')
      const { data: cachedProducts, error: cacheError } = await supabase
        .from('digiflazz_price_cache')
        .select('*')
        .eq('cmd', cmdType)

      if (!cacheError && cachedProducts && cachedProducts.length > 0) {
        // Transform to Digiflazz format
        const products = cachedProducts.map((p: any) => ({
          product_name: p.product_name,
          category: p.category,
          brand: p.brand,
          type: p.type,
          seller_name: p.seller_name,
          price: Number(p.price),
          buyer_sku_code: p.buyer_sku_code,
          buyer_product_status: p.buyer_product_status,
          seller_product_status: p.seller_product_status,
          unlimited_stock: p.unlimited_stock,
          stock: p.stock,
          multi: p.multi,
          start_cut_off: p.start_cut_off,
          end_cut_off: p.end_cut_off,
          desc: p.description,
        }))

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: products,
            count: products.length,
            cached: true,
            last_sync: lastSyncSetting?.value
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Get credentials from environment or system_settings
    let username = Deno.env.get('DIGIFLAZZ_USERNAME')
    let apiKey = Deno.env.get('DIGIFLAZZ_API_KEY')

    // If not in env, try to get from system_settings
    if (!username || !apiKey) {
      const { data: settings } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['digiflazz_username', 'digiflazz_api_key'])

      const settingsMap = (settings || []).reduce((acc: Record<string, string>, s: any) => {
        acc[s.key] = s.value
        return acc
      }, {})

      username = username || settingsMap.digiflazz_username
      apiKey = apiKey || settingsMap.digiflazz_api_key
    }

    if (!username || !apiKey) {
      console.error('Digiflazz credentials not configured')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Kredensial Digiflazz belum dikonfigurasi. Silakan isi di menu Pengaturan Sistem.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create MD5 signature using node:crypto
    const sign = createHash('md5')
      .update(username + apiKey + 'pricelist')
      .digest('hex')

    console.log(`Fetching ${cmdType} price list from Digiflazz API...`)

    // Use proxy if configured
    const proxyUrl = Deno.env.get('DIGIFLAZZ_PROXY_URL')
    const proxySecret = Deno.env.get('DIGIFLAZZ_PROXY_SECRET')
    
    const digiflazzEndpoint = proxyUrl 
      ? `${proxyUrl}/digiflazz/v1/price-list`
      : 'https://api.digiflazz.com/v1/price-list'
    
    const fetchHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
    if (proxyUrl && proxySecret) {
      fetchHeaders['X-Proxy-Secret'] = proxySecret
    }

    console.log(`Fetching price list from: ${digiflazzEndpoint} (proxy: ${!!proxyUrl})`)

    const response = await fetch(digiflazzEndpoint, {
      method: 'POST',
      headers: fetchHeaders,
      body: JSON.stringify({
        cmd: cmdType,
        username,
        sign
      })
    })

    const result = await response.json()

    if (result.data?.rc && result.data.rc !== '00') {
      console.error('Digiflazz API error:', result.data.message)
      
      // If rate limited, try to return cached data
      if (result.data.message?.includes('limitasi')) {
        console.log('Rate limited, attempting to return cached data...')
        const { data: cachedProducts } = await supabase
          .from('digiflazz_price_cache')
          .select('*')
          .eq('cmd', cmdType)

        if (cachedProducts && cachedProducts.length > 0) {
          const products = cachedProducts.map((p: any) => ({
            product_name: p.product_name,
            category: p.category,
            brand: p.brand,
            type: p.type,
            seller_name: p.seller_name,
            price: Number(p.price),
            buyer_sku_code: p.buyer_sku_code,
            buyer_product_status: p.buyer_product_status,
            seller_product_status: p.seller_product_status,
            unlimited_stock: p.unlimited_stock,
            stock: p.stock,
            multi: p.multi,
            start_cut_off: p.start_cut_off,
            end_cut_off: p.end_cut_off,
            desc: p.description,
          }))

          return new Response(
            JSON.stringify({ 
              success: true, 
              data: products,
              count: products.length,
              cached: true,
              warning: 'Menggunakan data cache karena limit API tercapai'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      return new Response(
        JSON.stringify({ success: false, error: result.data.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const products: DigiflazzPriceItem[] = result.data || []
    console.log(`Retrieved ${products.length} products from Digiflazz API`)

    // Update cache - upsert all products
    let productsSynced = 0
    let pricesChanged = 0
    const changes: { sku: string; name: string; old_cost: number; new_cost: number; old_point_price: number; new_point_price: number }[] = []

    if (products.length > 0) {
      const cacheData = products.map(p => ({
        buyer_sku_code: p.buyer_sku_code,
        product_name: p.product_name,
        category: p.category,
        brand: p.brand,
        type: p.type,
        seller_name: p.seller_name,
        price: p.price,
        buyer_product_status: p.buyer_product_status,
        seller_product_status: p.seller_product_status,
        unlimited_stock: p.unlimited_stock,
        stock: p.stock,
        multi: p.multi,
        start_cut_off: p.start_cut_off,
        end_cut_off: p.end_cut_off,
        description: p.desc,
        cmd: cmdType,
        updated_at: new Date().toISOString()
      }))

      // Upsert in batches of 100 to avoid timeout
      const batchSize = 100
      for (let i = 0; i < cacheData.length; i += batchSize) {
        const batch = cacheData.slice(i, i + batchSize)
        const { error: upsertError } = await supabase
          .from('digiflazz_price_cache')
          .upsert(batch, { onConflict: 'buyer_sku_code' })

        if (upsertError) {
          console.error(`Cache upsert batch ${i / batchSize + 1} error:`, upsertError)
        }
      }

      // Update last sync time
      await supabase
        .from('system_settings')
        .upsert({ 
          key: 'digiflazz_last_sync', 
          value: new Date().toISOString() 
        }, { onConflict: 'key' })

      console.log(`Cached ${products.length} products successfully`)

      // === AUTO-SYNC PRODUCTS TABLE ===
      // Get all PPOB products that have a digiflazz_sku configured
      const { data: existingProducts, error: productsError } = await supabase
        .from('products')
        .select('id, name, digiflazz_sku, cost_price, point_price')
        .eq('type', 'ppob')
        .not('digiflazz_sku', 'is', null)

      if (productsError) {
        console.error('Error fetching products for sync:', productsError)
      } else if (existingProducts && existingProducts.length > 0) {
        console.log(`Found ${existingProducts.length} PPOB products to check for price updates`)

        // Create a map of SKU to Digiflazz price for quick lookup
        const priceMap = new Map<string, number>()
        products.forEach(p => {
          priceMap.set(p.buyer_sku_code, p.price)
        })

        // Function to calculate point price: cost + 1000 margin, then round up to nearest 500
        // Example: 10200 + 1000 = 11200, round up to 11500
        const calculatePointPrice = (costPrice: number): number => {
          const withMargin = costPrice + 1000
          return Math.ceil(withMargin / 500) * 500
        }

        // Check each product and update if price changed
        for (const product of existingProducts) {
          if (!product.digiflazz_sku) continue

          const newCostPrice = priceMap.get(product.digiflazz_sku)
          if (newCostPrice !== undefined) {
            productsSynced++
            
            const newPointPrice = calculatePointPrice(newCostPrice)
            const costChanged = Number(product.cost_price) !== newCostPrice
            const pointPriceChanged = Number(product.point_price) !== newPointPrice
            
            // Update if either cost_price or point_price changed
            if (costChanged || pointPriceChanged) {
              const { error: updateError } = await supabase
                .from('products')
                .update({ 
                  cost_price: newCostPrice,
                  point_price: newPointPrice,
                  updated_at: new Date().toISOString()
                })
                .eq('id', product.id)

              if (updateError) {
                console.error(`Error updating product ${product.digiflazz_sku}:`, updateError)
              } else {
                pricesChanged++
                changes.push({
                  sku: product.digiflazz_sku,
                  name: product.name,
                  old_cost: Number(product.cost_price),
                  new_cost: newCostPrice,
                  old_point_price: Number(product.point_price),
                  new_point_price: newPointPrice
                })
                console.log(`Updated ${product.digiflazz_sku}: cost ${product.cost_price} -> ${newCostPrice}, point_price ${product.point_price} -> ${newPointPrice}`)
              }
            }
          } else {
            console.warn(`SKU ${product.digiflazz_sku} not found in Digiflazz price list`)
          }
        }

        console.log(`Product sync complete: ${productsSynced} checked, ${pricesChanged} prices updated`)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: products,
        count: products.length,
        cached: false,
        products_synced: productsSynced,
        prices_changed: pricesChanged,
        changes
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error fetching price list:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
