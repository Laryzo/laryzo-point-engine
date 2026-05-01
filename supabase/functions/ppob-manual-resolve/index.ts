import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

async function distributePoints(
  supabase: any,
  customerId: string,
  orderId: string,
  profit: number,
  productCode: string
) {
  const points: any[] = []

  // 1% to customer (level 0)
  points.push({
    from_customer: customerId,
    to_customer: customerId,
    points: profit * 0.01,
    level: 0,
    transaction_id: orderId,
    product_code: productCode,
    description: `Bonus poin pembelian ${productCode}`,
  })

  // up to 10 upline levels
  let curr = customerId
  for (let level = 1; level <= 10; level++) {
    const { data: cust } = await supabase
      .from('customers')
      .select('parent_id')
      .eq('id', curr)
      .single()
    if (!cust?.parent_id) break
    points.push({
      from_customer: customerId,
      to_customer: cust.parent_id,
      points: profit * 0.01,
      level,
      transaction_id: orderId,
      product_code: productCode,
      description: `Bonus jaringan level ${level}`,
    })
    curr = cust.parent_id
  }

  if (points.length > 0) {
    const { error } = await supabase.from('point_history').insert(points)
    if (error) throw error
  }
  return points.length
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const admin = createClient(supabaseUrl, serviceKey)

    // Validate caller via JWT (could be admin or customer)
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '').trim()
    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data: userData, error: userError } = await userClient.auth.getUser(token)
    if (userError || !userData?.user?.email) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userEmail = userData.user.email

    const { order_id, action, sn } = await req.json()
    const validActions = ['success', 'fail', 'customer_cancel', 'customer_confirm']
    if (!order_id || !validActions.includes(action)) {
      return new Response(
        JSON.stringify({ success: false, error: `order_id and action (${validActions.join('|')}) required` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const isCustomerAction = action === 'customer_cancel' || action === 'customer_confirm'

    // Authorization check
    if (!isCustomerAction) {
      // Admin actions
      const { data: adminRow } = await admin
        .from('admins')
        .select('email, role')
        .eq('email', userEmail)
        .single()
      if (!adminRow) {
        return new Response(
          JSON.stringify({ success: false, error: 'Forbidden — admin only' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const { data: order, error: orderError } = await admin
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ success: false, error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // For customer actions, verify ownership via customer_auth lookup
    if (isCustomerAction) {
      const { data: custAuth } = await admin
        .from('customer_auth')
        .select('customer_id')
        .eq('email', userEmail)
        .single()
      if (!custAuth || custAuth.customer_id !== order.customer_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'Forbidden — not your order' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    if (order.status !== 'manual_pending') {
      return new Response(
        JSON.stringify({ success: false, error: `Order status invalid: ${order.status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Action: customer_confirm — non-destructive, just mark confirmed
    if (action === 'customer_confirm') {
      await admin
        .from('orders')
        .update({ customer_confirmed_at: new Date().toISOString() })
        .eq('id', order_id)
      console.log(`Order ${order_id} dikonfirmasi diterima oleh customer ${userEmail}`)
      return new Response(
        JSON.stringify({ success: true, status: 'confirmed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'success') {
      const { data: product } = await admin
        .from('products')
        .select('digiflazz_sku, name, point_price, cost_price')
        .eq('id', order.product_id)
        .single()

      const profit = (product?.point_price || 0) - (product?.cost_price || 0)
      let distributed = 0
      if (profit > 0 && product) {
        distributed = await distributePoints(
          admin,
          order.customer_id,
          order.id,
          profit,
          product.digiflazz_sku || product.name
        )
      }

      await admin
        .from('orders')
        .update({
          status: 'completed',
          digiflazz_status: 'sukses',
          digiflazz_message: 'Diproses manual oleh admin',
          digiflazz_sn: sn || null,
          processed_at: new Date().toISOString(),
        })
        .eq('id', order_id)

      console.log(`Order ${order_id} ditandai SUKSES manual oleh ${userData.user.email}, distribusi ke ${distributed} penerima`)

      return new Response(
        JSON.stringify({ success: true, status: 'completed', distributed }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // action === 'fail' (admin) atau 'customer_cancel' (customer) → refund poin
    const isCancelByCustomer = action === 'customer_cancel'
    const refundDescription = isCancelByCustomer
      ? `Refund poin - dibatalkan oleh customer`
      : `Refund poin - manual ditandai gagal oleh admin`
    const failMessage = isCancelByCustomer
      ? 'Dibatalkan oleh customer (poin direfund)'
      : 'Ditandai gagal manual oleh admin (poin direfund)'

    const { error: refundError } = await admin.from('point_history').insert({
      from_customer: null,
      to_customer: order.customer_id,
      points: order.points_used,
      level: 0,
      transaction_id: null,
      product_code: 'REFUND',
      description: refundDescription,
    })

    if (refundError) {
      console.error('Refund error:', refundError)
      return new Response(
        JSON.stringify({ success: false, error: 'Gagal refund poin' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    await admin
      .from('orders')
      .update({
        status: 'failed',
        digiflazz_status: 'gagal',
        digiflazz_message: failMessage,
      })
      .eq('id', order_id)

    console.log(`Order ${order_id} ditandai GAGAL (${action}) oleh ${userEmail}, poin direfund`)

    return new Response(
      JSON.stringify({ success: true, status: 'failed', refunded: order.points_used }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('ppob-manual-resolve error:', err)
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
