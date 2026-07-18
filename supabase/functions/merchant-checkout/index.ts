import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify merchant auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!).auth.getUser(token)
    if (authError || !user) throw new Error('Unauthorized')

    // Find merchant
    const { data: merchantAuth } = await supabase
      .from('merchant_auth')
      .select('merchant_id')
      .eq('email', user.email.toLowerCase())
      .single()
    if (!merchantAuth) throw new Error('Not a merchant')

    const merchantId = merchantAuth.merchant_id

    const { items, customer_id, notes } = await req.json()
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Cart is empty')
    }

    // Fetch customer tree data if customer selected
    let customerMap = new Map<string, any>()
    let customerName: string | null = null
    if (customer_id) {
      const { data: allCustomers } = await supabase
        .from('customers')
        .select('id, name, parent_id, points_blocked')
      allCustomers?.forEach(c => customerMap.set(c.id, c))
      const selectedCustomer = customerMap.get(customer_id)
      if (selectedCustomer) {
        customerName = selectedCustomer.name
      }
    }

    // Pre-fetch all catalog products referenced in the cart from the database.
    // Prices/cost are NEVER trusted from the client — only the DB is authoritative.
    const productIds = items
      .map((i: any) => i.product_id)
      .filter((id: any) => id && typeof id === 'string')
    const productMap = new Map<string, any>()
    if (productIds.length > 0) {
      const { data: dbProducts, error: pErr } = await supabase
        .from('merchant_products')
        .select('id, name, price, cost_price, stock, unit, merchant_id')
        .in('id', productIds)
      if (pErr) throw pErr
      for (const p of dbProducts || []) {
        productMap.set(p.id, p)
      }
    }

    const POINT_PERCENTAGE = 0.01
    const MAX_UPLINE_LEVELS = 10
    const results = []

    for (const item of items) {
      const { product_id, product_name, qty, unit } = item
      const qtyNum = Number(qty) || 0

      let dbPricePerUnit = 0
      let dbCostPerUnit = 0
      let resolvedName = product_name || 'Produk'
      let resolvedUnit = unit || null
      let stockValue: number | null = null

      if (product_id) {
        const dbProduct = productMap.get(product_id)
        if (!dbProduct) {
          throw new Error(`Produk dengan ID ${product_id} tidak ditemukan`)
        }
        // Security: ensure the product belongs to this merchant
        if (dbProduct.merchant_id && dbProduct.merchant_id !== merchantId) {
          throw new Error(`Akses ditolak: produk ${product_id} bukan milik mitra ini`)
        }
        dbPricePerUnit = Number(dbProduct.price) || 0
        dbCostPerUnit = Number(dbProduct.cost_price) || 0
        resolvedName = dbProduct.name || product_name || 'Produk'
        resolvedUnit = dbProduct.unit || unit || null
        stockValue = typeof dbProduct.stock === 'number' ? dbProduct.stock : null
      } else {
        // Ad-hoc / service item: merchant supplies the price, but cost_price must
        // be zero (no markup margin credited to the merchant themselves).
        const clientPrice = Number(item.price) || 0
        if (clientPrice < 0) {
          throw new Error('Harga tidak boleh negatif')
        }
        dbPricePerUnit = clientPrice
        dbCostPerUnit = 0
      }

      const total = Math.round(dbPricePerUnit * qtyNum)
      const merchantRevenue = Math.round(dbCostPerUnit * qtyNum)
      const fee = total - merchantRevenue

      const pointsPerLevel = fee * POINT_PERCENTAGE
      const customerPoints = customer_id ? pointsPerLevel : 0

      // 1. Insert merchant_transactions
      const { error: mtError } = await supabase.from('merchant_transactions').insert({
        merchant_id: merchantId,
        product_id: product_id || null,
        customer_id: customer_id || null,
        customer_name: customerName,
        product_name: resolvedName,
        price: dbPricePerUnit,
        qty: qtyNum,
        qty_decimal: qtyNum,
        unit: resolvedUnit,
        total,
        laryzo_fee: fee,
        customer_points_earned: customerPoints,
        merchant_price: dbCostPerUnit,
        notes: notes || null,
      })

      if (mtError) {
        console.error('Merchant transactions insert error:', mtError)
        if (mtError.code === '42703') {
          const { error: mtErrorRetry } = await supabase.from('merchant_transactions').insert({
            merchant_id: merchantId,
            product_id: product_id || null,
            customer_id: customer_id || null,
            product_name: resolvedName,
            price: dbPricePerUnit,
            qty: qtyNum,
            total,
            laryzo_fee: fee,
            customer_points_earned: customerPoints,
            notes: notes || null,
          })
          if (mtErrorRetry) throw mtErrorRetry
        } else {
          throw mtError
        }
      }

      // 2. Insert into main transactions table (so it shows in admin panel)
      const hargaKonsumen = dbPricePerUnit
      const hargaPokokMitra = dbCostPerUnit
      const marginPerUnit = hargaKonsumen - hargaPokokMitra

      const { data: txData, error: txError } = await supabase.from('transactions').insert({
        product_code: `MITRA-${resolvedName.substring(0, 20)}`,
        product_name: resolvedName,
        product_type: 'Mitra',
        qty: qtyNum,
        margin: marginPerUnit,
        customer_id: customer_id || null,
        harga_konsumen: hargaKonsumen,
        harga_pokok: hargaPokokMitra,
      }).select('id')

      const insertedTx = txData && txData.length > 0 ? txData[0] : null
      if (txError || !insertedTx) {
        console.error('Transaction insert error:', txError)
      }

      // 3. Distribute points if customer is selected
      if (customer_id && fee > 0) {
        const pointRecords: any[] = []

        if (insertedTx) {
          const pointsFromProfit = fee * POINT_PERCENTAGE

          const selfCustomer = customerMap.get(customer_id)
          if (selfCustomer && !selfCustomer.points_blocked) {
            pointRecords.push({
              transaction_id: insertedTx.id,
              from_customer: customer_id,
              to_customer: customer_id,
              level: 0,
              points: pointsFromProfit,
              product_code: `MITRA-${resolvedName.substring(0, 20)}`,
            })
          }

          let currentCustomerId = customer_id
          for (let level = 1; level <= MAX_UPLINE_LEVELS; level++) {
            const current = customerMap.get(currentCustomerId)
            if (!current || !current.parent_id) break

            const parent = customerMap.get(current.parent_id)
            if (parent && !parent.points_blocked) {
              pointRecords.push({
                transaction_id: insertedTx.id,
                from_customer: customer_id,
                to_customer: current.parent_id,
                level,
                points: pointsFromProfit,
                product_code: `MITRA-${resolvedName.substring(0, 20)}`,
              })
            }
            currentCustomerId = current.parent_id
          }
        }

        if (pointRecords.length > 0) {
          const { error: phError } = await supabase.from('point_history').insert(pointRecords)
          if (phError) {
            console.error('Point history insert error:', phError)
          }
        }
      }

      // 4. Update stock — only for catalog products with finite stock, using DB-verified value
      if (product_id && stockValue !== null && stockValue >= 0) {
        await supabase.from('merchant_products')
          .update({ stock: Math.max(0, stockValue - Math.ceil(qtyNum)) })
          .eq('id', product_id)
      }

      results.push({ product_name: resolvedName, total })
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Merchant checkout error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
