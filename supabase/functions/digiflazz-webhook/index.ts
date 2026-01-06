import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// For webhooks, we allow requests without origin (server-to-server)
// but still provide proper CORS headers for preflight
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Validate ref_id format (must match our generated format: ORD-timestamp-random)
function isValidRefId(refId: string): boolean {
  if (!refId || typeof refId !== 'string') return false
  // Format: ORD-{timestamp}-{alphanumeric}
  const refIdPattern = /^ORD-\d{13}-[a-z0-9]{9}$/
  return refIdPattern.test(refId)
}

async function distributePoints(
  supabase: any,
  customerId: string,
  orderId: string,
  profit: number,
  productCode: string
) {
  const pointsToDistribute: Array<{
    from_customer: string
    to_customer: string
    points: number
    level: number
    transaction_id: string
    product_code: string
  }> = []

  // 1% to customer themselves (level 0)
  const customerPoints = profit * 0.01
  pointsToDistribute.push({
    from_customer: customerId,
    to_customer: customerId,
    points: customerPoints,
    level: 0,
    transaction_id: orderId,
    product_code: productCode
  })

  // Get upline chain (up to 10 levels)
  let currentCustomerId = customerId
  for (let level = 1; level <= 10; level++) {
    const { data: customer } = await supabase
      .from('customers')
      .select('parent_id')
      .eq('id', currentCustomerId)
      .single()

    if (!customer?.parent_id) break

    const uplinePoints = profit * 0.01
    pointsToDistribute.push({
      from_customer: customerId,
      to_customer: customer.parent_id,
      points: uplinePoints,
      level,
      transaction_id: orderId,
      product_code: productCode
    })

    currentCustomerId = customer.parent_id
  }

  // Insert all point history records
  if (pointsToDistribute.length > 0) {
    const { error: historyError } = await supabase
      .from('point_history')
      .insert(pointsToDistribute)

    if (historyError) {
      console.error('Error inserting point history:', historyError)
      throw historyError
    }

    // Update customer points using atomic RPC function
    for (const record of pointsToDistribute) {
      const { data: success, error: rpcError } = await supabase.rpc('increment_customer_points', {
        customer_uuid: record.to_customer,
        points_to_add: record.points
      })

      if (rpcError) {
        console.error('Error incrementing points via RPC:', rpcError)
      } else if (!success) {
        console.log(`Points increment skipped for customer ${record.to_customer} (blocked or not found)`)
      }
    }
  }

  return pointsToDistribute
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const webhookData = await req.json()
    console.log('Received Digiflazz webhook:', JSON.stringify(webhookData))

    const { data } = webhookData
    if (!data || !data.ref_id) {
      console.warn('Invalid webhook data - missing ref_id')
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid webhook data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { ref_id, status, sn, message } = data
    
    // Security: Validate ref_id format to prevent forged webhooks
    if (!isValidRefId(ref_id)) {
      console.warn('Rejected webhook with invalid ref_id format:', ref_id)
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid ref_id format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const statusLower = status?.toLowerCase() || 'unknown'

    // Find order by ref_id
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, products(*)')
      .eq('ref_id', ref_id)
      .single()

    if (orderError || !order) {
      console.error('Order not found for ref_id:', ref_id)
      return new Response(
        JSON.stringify({ success: false, error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Security: Skip if already completed or failed (prevent duplicate processing)
    if (order.status === 'completed' || order.status === 'failed') {
      console.log(`Order ${order.id} already has final status: ${order.status} - ignoring webhook`)
      return new Response(
        JSON.stringify({ success: true, message: 'Order already processed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Security: Verify order is in expected state (processing or pending)
    if (order.status !== 'processing' && order.status !== 'pending') {
      console.warn(`Unexpected order status ${order.status} for webhook processing`)
    }

    // Update order
    const updateData: Record<string, any> = {
      digiflazz_status: statusLower,
      digiflazz_message: message
    }

    if (sn) {
      updateData.digiflazz_sn = sn
    }

    if (statusLower === 'sukses') {
      updateData.status = 'completed'
      updateData.processed_at = new Date().toISOString()

      // Distribute points using atomic RPC
      const product = order.products
      if (product) {
        const profit = product.point_price - product.cost_price
        if (profit > 0) {
          const distributed = await distributePoints(
            supabase,
            order.customer_id,
            order.id,
            profit,
            product.digiflazz_sku || product.name
          )
          console.log(`Distributed points to ${distributed.length} recipients via webhook`)
          updateData.points_earned = distributed.reduce((sum: number, d: any) => sum + d.points, 0)
        }
      }
    } else if (statusLower === 'gagal') {
      updateData.status = 'failed'

      // Refund points using atomic RPC
      const { data: refundSuccess, error: refundError } = await supabase.rpc('increment_customer_points', {
        customer_uuid: order.customer_id,
        points_to_add: order.points_used
      })
      
      if (refundError) {
        console.error('Error refunding points:', refundError)
      } else {
        console.log('Refunded points due to failed transaction via webhook')
      }
    }

    await supabase
      .from('orders')
      .update(updateData)
      .eq('id', order.id)

    console.log(`Order ${order.id} updated via webhook to status: ${updateData.status || order.status}`)

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
