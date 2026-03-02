import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS configuration - restrict to trusted origins
const ALLOWED_ORIGINS = [
  'https://lovable.dev',
  'https://jkqtqxwtyqrlhblnaohz.lovableproject.com',
  'https://laryzo.biz.id',
  'http://localhost:5173',
  'http://localhost:3000',
]

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || origin.endsWith('.lovable.dev') || origin.endsWith('.lovableproject.com') || origin.endsWith('.lovable.app')
  )
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    description: string
  }> = []

  // 1% to customer themselves (level 0)
  const customerPoints = profit * 0.01
  pointsToDistribute.push({
    from_customer: customerId,
    to_customer: customerId,
    points: customerPoints,
    level: 0,
    transaction_id: orderId,
    product_code: productCode,
    description: `Bonus poin pembelian ${productCode}`
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
      product_code: productCode,
      description: `Bonus jaringan level ${level}`
    })

    currentCustomerId = customer.parent_id
  }

  // Insert all point history records
  // Note: customers.points is automatically updated via database trigger (sync_points_on_history_change)
  if (pointsToDistribute.length > 0) {
    const { error: historyError } = await supabase
      .from('point_history')
      .insert(pointsToDistribute)

    if (historyError) {
      console.error('Error inserting point history:', historyError)
      throw historyError
    }

    console.log(`Inserted ${pointsToDistribute.length} point history records (trigger updates customers.points automatically)`)
  }

  return pointsToDistribute
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Validate origin for non-preflight requests
  if (!isOriginAllowed(origin)) {
    console.warn('Blocked process-physical-order request from unauthorized origin:', origin)
    return new Response(
      JSON.stringify({ error: 'Origin not allowed' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const { order_id, tracking_number, shipping_status, admin_notes } = await req.json()

    if (!order_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'order_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing physical order: ${order_id}`)

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      console.error('Order not found:', orderError)
      return new Response(
        JSON.stringify({ success: false, error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get product details
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', order.product_id)
      .single()

    if (productError || !product) {
      console.error('Product not found:', productError)
      return new Response(
        JSON.stringify({ success: false, error: 'Product not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update order
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    }

    if (tracking_number) {
      updateData.tracking_number = tracking_number
      updateData.shipping_status = 'shipped'
    }

    if (shipping_status) {
      updateData.shipping_status = shipping_status
    }

    if (admin_notes) {
      updateData.admin_notes = admin_notes
    }

    // If marking as completed/delivered, distribute points
    if (shipping_status === 'delivered' && order.status !== 'completed') {
      updateData.status = 'completed'
      updateData.processed_at = new Date().toISOString()

      // Calculate profit and distribute points
      const profit = product.point_price - product.cost_price
      if (profit > 0) {
        const distributed = await distributePoints(
          supabase,
          order.customer_id,
          order_id,
          profit,
          product.name
        )
        console.log(`Distributed points to ${distributed.length} recipients`)
        updateData.points_earned = distributed.reduce((sum, d) => sum + d.points, 0)
      }
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', order_id)

    if (updateError) {
      console.error('Failed to update order:', updateError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Order updated successfully',
        tracking_number: updateData.tracking_number,
        shipping_status: updateData.shipping_status
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing physical order:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
