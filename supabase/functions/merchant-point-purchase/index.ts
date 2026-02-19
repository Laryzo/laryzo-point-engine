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

    // Verify customer auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')

    const token = authHeader.replace('Bearer ', '')
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token)
    if (authError || !user) throw new Error('Unauthorized')

    // Find customer by email
    const { data: customerAuth } = await supabase
      .from('customer_auth')
      .select('customer_id')
      .eq('email', user.email)
      .single()
    if (!customerAuth) throw new Error('Not a customer')

    const customerId = customerAuth.customer_id

    const { product_id } = await req.json()
    if (!product_id) throw new Error('product_id is required')

    // Get merchant product
    const { data: product, error: prodErr } = await supabase
      .from('merchant_products')
      .select('*')
      .eq('id', product_id)
      .eq('is_active', true)
      .single()
    if (prodErr || !product) throw new Error('Product not found')

    const pointPrice = Number(product.point_price)
    if (pointPrice <= 0) throw new Error('This product cannot be purchased with points')

    // Get customer points
    const { data: customer } = await supabase
      .from('customers')
      .select('id, name, points, points_blocked')
      .eq('id', customerId)
      .single()
    if (!customer) throw new Error('Customer not found')
    if (customer.points_blocked) throw new Error('Your points are blocked')
    if ((customer.points || 0) < pointPrice) throw new Error('Insufficient points')

    // Check stock
    if (product.stock >= 0 && product.stock < 1) {
      throw new Error('Product out of stock')
    }

    // 1. Deduct points via negative point_history (trigger auto-syncs customers.points)
    const { error: phError } = await supabase.from('point_history').insert({
      from_customer: customerId,
      to_customer: customerId,
      level: 0,
      points: -pointPrice,
      product_code: `MITRA-BELI-${product.name.substring(0, 20)}`,
    })
    if (phError) throw new Error('Failed to deduct points: ' + phError.message)

    // 2. Record in merchant_transactions
    const { error: mtError } = await supabase.from('merchant_transactions').insert({
      merchant_id: product.merchant_id,
      product_id: product.id,
      customer_id: customerId,
      customer_name: customer.name,
      product_name: product.name,
      price: product.price,
      qty: 1,
      total: product.price,
      laryzo_fee: 0,
      customer_points_earned: 0,
      notes: `Pembelian dengan ${pointPrice} poin`,
    })
    if (mtError) {
      console.error('merchant_transactions insert error:', mtError)
    }

    // 3. Update stock
    if (product.stock >= 0) {
      await supabase.from('merchant_products')
        .update({ stock: product.stock - 1 })
        .eq('id', product_id)
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Berhasil membeli ${product.name} dengan ${pointPrice} poin`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Merchant point purchase error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
