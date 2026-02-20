import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHash } from 'node:crypto'

// CORS configuration - restrict to trusted origins
const ALLOWED_ORIGINS = [
  'https://lovable.dev',
  'https://jkqtqxwtyqrlhblnaohz.lovableproject.com',
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

interface Order {
  id: string
  customer_id: string
  product_id: string
  points_used: number
  input_value: string
  status: string
  ref_id: string | null
}

interface Product {
  id: string
  name: string
  digiflazz_sku: string
  point_price: number
  cost_price: number
}

interface Customer {
  id: string
  name: string
  points: number
  parent_id: string | null
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
    console.warn('Blocked digiflazz-topup request from unauthorized origin:', origin)
    return new Response(
      JSON.stringify({ error: 'Origin not allowed' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
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

    const { order_id, testing = false } = await req.json()

    if (!order_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'order_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing order: ${order_id}`)

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

    if (order.status !== 'pending') {
      return new Response(
        JSON.stringify({ success: false, error: `Order already processed with status: ${order.status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // Get customer details
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', order.customer_id)
      .single()

    if (customerError || !customer) {
      console.error('Customer not found:', customerError)
      return new Response(
        JSON.stringify({ success: false, error: 'Customer not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify customer has enough points
    if (customer.points < order.points_used) {
      return new Response(
        JSON.stringify({ success: false, error: 'Insufficient points' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate unique ref_id
    const refId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Deduct points from customer first using atomic RPC to prevent race conditions
    const { data: deductSuccess, error: deductError } = await supabase.rpc(
      'increment_customer_points',
      {
        customer_uuid: customer.id,
        points_to_add: -order.points_used
      }
    )

    if (deductError) {
      console.error('Failed to deduct points:', deductError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to deduct points' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!deductSuccess) {
      console.error('Point deduction failed - customer may be blocked or has insufficient balance')
      return new Response(
        JSON.stringify({ success: false, error: 'Insufficient points or account blocked' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Points have been deducted - from here, any error should trigger a refund
    let pointsDeducted = true

    try {
      // Create MD5 signature for transaction using node:crypto
      const sign = createHash('md5')
        .update(username + apiKey + refId)
        .digest('hex')

      console.log(`Sending topup request to Digiflazz for SKU: ${product.digiflazz_sku}`)

      // Check development mode from system_settings
      const { data: settingsData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'digiflazz_mode')
        .single()

      const isDevelopment = settingsData?.value === 'development' || testing

      // Send request to Digiflazz (via proxy if configured)
      const proxyUrl = Deno.env.get('DIGIFLAZZ_PROXY_URL')
      const proxySecret = Deno.env.get('DIGIFLAZZ_PROXY_SECRET')
      
      const digiflazzEndpoint = proxyUrl 
        ? `${proxyUrl}/digiflazz/v1/transaction`
        : 'https://api.digiflazz.com/v1/transaction'
      
      const fetchHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
      if (proxyUrl && proxySecret) {
        fetchHeaders['X-Proxy-Secret'] = proxySecret
      }

      console.log(`Sending request to: ${digiflazzEndpoint} (proxy: ${!!proxyUrl})`)

      const digiflazzResponse = await fetch(digiflazzEndpoint, {
        method: 'POST',
        headers: fetchHeaders,
        body: JSON.stringify({
          username,
          buyer_sku_code: product.digiflazz_sku,
          customer_no: order.input_value,
          ref_id: refId,
          sign,
          testing: isDevelopment
        })
      })

      const digiflazzResult = await digiflazzResponse.json()
      console.log('Digiflazz response:', JSON.stringify(digiflazzResult))

      const txData = digiflazzResult.data || {}
      const status = txData.status?.toLowerCase() || 'failed'

      // Update order with Digiflazz response
      const updateData: Record<string, any> = {
        ref_id: refId,
        digiflazz_status: status,
        digiflazz_message: txData.message || txData.rc,
        digiflazz_sn: txData.sn || null
      }

      if (status === 'sukses') {
        updateData.status = 'completed'
        updateData.processed_at = new Date().toISOString()

        // Calculate profit and distribute points
        const profit = product.point_price - product.cost_price
        if (profit > 0) {
          const distributed = await distributePoints(
            supabase,
            customer.id,
            order_id,
            profit,
            product.digiflazz_sku || product.name
          )
          console.log(`Distributed points to ${distributed.length} recipients`)
        }

        // Save phone number to history for pulsa/emoney (requires_input = 'phone')
        if (order.input_value && product.requires_input === 'phone') {
          try {
            // Upsert: insert or update if exists
            const { error: historyError } = await supabase
              .from('customer_phone_history')
              .upsert(
                {
                  customer_id: customer.id,
                  phone_number: order.input_value,
                  last_used_at: new Date().toISOString(),
                  use_count: 1
                },
                {
                  onConflict: 'customer_id,phone_number',
                  ignoreDuplicates: false
                }
              )
            
            if (historyError) {
              console.error('Failed to save phone history:', historyError)
            } else {
              // If upsert succeeded, increment use_count for existing records
              await supabase
                .from('customer_phone_history')
                .update({ 
                  use_count: supabase.rpc ? undefined : 1, // Will be handled by SQL below
                  last_used_at: new Date().toISOString()
                })
                .eq('customer_id', customer.id)
                .eq('phone_number', order.input_value)
              
              console.log('Saved phone number to history:', order.input_value)
            }
          } catch (histErr) {
            console.error('Phone history save error:', histErr)
          }
        }

      } else if (status === 'pending') {
        updateData.status = 'processing'
      } else {
        // Failed - refund points via point_history INSERT (trigger handles customers.points update)
        updateData.status = 'failed'
        const { error: refundError } = await supabase.from('point_history').insert({
          from_customer: null,
          to_customer: customer.id,
          points: order.points_used,
          level: 0,
          transaction_id: null,
          product_code: 'REFUND',
          description: `Refund poin - transaksi gagal`
        })
        
        if (refundError) {
          console.error('Failed to insert refund to point_history:', refundError)
        } else {
          console.log('Refunded points via point_history due to failed transaction')
          pointsDeducted = false
        }
      }

      const { error: updateOrderError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', order_id)

      if (updateOrderError) {
        console.error('Failed to update order:', updateOrderError)
      }

      return new Response(
        JSON.stringify({ 
          success: status !== 'gagal',
          status: updateData.status,
          sn: txData.sn,
          message: txData.message,
          ref_id: refId
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (innerError) {
      // Error occurred after points were deducted - refund them via point_history
      console.error('Error after point deduction, attempting refund:', innerError)
      
      if (pointsDeducted) {
        const { error: refundError } = await supabase.from('point_history').insert({
          from_customer: null,
          to_customer: customer.id,
          points: order.points_used,
          level: 0,
          transaction_id: null,
          product_code: 'REFUND',
          description: `Refund poin - terjadi kesalahan`
        })
        
        if (refundError) {
          console.error('CRITICAL: Failed to insert refund to point_history after error:', refundError)
        } else {
          console.log('Successfully refunded points via point_history after error')
        }
      }

      // Update order status to failed
      await supabase
        .from('orders')
        .update({ 
          status: 'failed',
          digiflazz_message: innerError.message || 'Processing error'
        })
        .eq('id', order_id)

      throw innerError
    }

  } catch (error) {
    console.error('Error processing topup:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
