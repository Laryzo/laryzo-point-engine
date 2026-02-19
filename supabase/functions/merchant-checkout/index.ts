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
      .eq('email', user.email)
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

    const POINT_PERCENTAGE = 0.01
    const MAX_UPLINE_LEVELS = 10
    const results = []

    for (const item of items) {
      const { product_id, product_name, price, qty, stock, cost_price } = item
      const total = price * qty
      const fee = total * 0.05 // 5% fee for Laryzo (margin)
      const pointsPerCustomer = fee * POINT_PERCENTAGE // 1% of fee per eligible customer
      const customerPoints = customer_id ? pointsPerCustomer : 0

      // 1. Insert merchant_transactions
      const { error: mtError } = await supabase.from('merchant_transactions').insert({
        merchant_id: merchantId,
        product_id,
        customer_id: customer_id || null,
        customer_name: customerName,
        product_name,
        price,
        qty,
        total,
        laryzo_fee: fee,
        customer_points_earned: customerPoints,
        notes: notes || null,
      })
      if (mtError) throw mtError

      // 2. Insert into main transactions table (so it shows in admin panel)
      const marginPerUnit = fee / qty

      const { data: txData, error: txError } = await supabase.from('transactions').insert({
        product_code: `MITRA-${product_name.substring(0, 20)}`,
        product_name: product_name,
        product_type: 'Mitra',
        qty,
        margin: marginPerUnit,
        customer_id: customer_id || null,
        harga_konsumen: price,
        harga_pokok: price - marginPerUnit,
      }).select('id').single()
      if (txError) throw txError

      // 3. Distribute points if customer is selected
      if (customer_id && fee > 0) {
        const pointsPerLevel = fee * POINT_PERCENTAGE
        const pointRecords: any[] = []

        const selfCustomer = customerMap.get(customer_id)
        if (selfCustomer && !selfCustomer.points_blocked) {
          pointRecords.push({
            transaction_id: txData.id,
            from_customer: customer_id,
            to_customer: customer_id,
            level: 0,
            points: pointsPerLevel,
            product_code: `MITRA-${product_name.substring(0, 20)}`,
          })
        }

        let currentCustomerId = customer_id
        for (let level = 1; level <= MAX_UPLINE_LEVELS; level++) {
          const current = customerMap.get(currentCustomerId)
          if (!current || !current.parent_id) break

          const parent = customerMap.get(current.parent_id)
          if (parent && !parent.points_blocked) {
            pointRecords.push({
              transaction_id: txData.id,
              from_customer: customer_id,
              to_customer: current.parent_id,
              level,
              points: pointsPerLevel,
              product_code: `MITRA-${product_name.substring(0, 20)}`,
            })
          }
          currentCustomerId = current.parent_id
        }

        if (pointRecords.length > 0) {
          const { error: phError } = await supabase.from('point_history').insert(pointRecords)
          if (phError) {
            console.error('Point history insert error:', phError)
          }
        }
      }

      // 4. Update stock
      if (stock >= 0) {
        await supabase.from('merchant_products')
          .update({ stock: stock - qty })
          .eq('id', product_id)
      }

      results.push({ product_name, total })
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
