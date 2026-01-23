import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHash } from 'node:crypto'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
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
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Kredensial Digiflazz belum dikonfigurasi. Silakan isi di menu Pengaturan Sistem.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { order_id } = await req.json()

    if (!order_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'order_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
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

    if (!order.ref_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Order has no ref_id - not yet processed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Checking status for order: ${order_id}, ref_id: ${order.ref_id}`)

    // Create MD5 signature using node:crypto
    const sign = createHash('md5')
      .update(username + apiKey + order.ref_id)
      .digest('hex')

    // Check status with Digiflazz
    const response = await fetch('https://api.digiflazz.com/v1/transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cmd: 'status',
        username,
        ref_id: order.ref_id,
        sign
      })
    })

    const result = await response.json()
    console.log('Digiflazz status response:', JSON.stringify(result))

    const txData = result.data || {}
    const status = txData.status?.toLowerCase() || 'unknown'

    // Update order with new status
    const updateData: Record<string, any> = {
      digiflazz_status: status,
      digiflazz_message: txData.message || txData.rc
    }

    if (txData.sn) {
      updateData.digiflazz_sn = txData.sn
    }

    if (status === 'sukses') {
      updateData.status = 'completed'
      updateData.processed_at = new Date().toISOString()

      // Distribute points if not already done
      if (order.status !== 'completed') {
        const { data: product } = await supabase
          .from('products')
          .select('*')
          .eq('id', order.product_id)
          .single()

        if (product) {
          const profit = product.point_price - product.cost_price
          if (profit > 0) {
            // Distribute points logic here (same as in digiflazz-topup)
            console.log('Points distribution should happen here for newly completed order')
          }
        }
      }
    } else if (status === 'gagal') {
      updateData.status = 'failed'

      // Refund points via point_history INSERT if order was not yet completed or failed
      // Database trigger handles customers.points update automatically
      if (order.status !== 'completed' && order.status !== 'failed') {
        const { error: refundError } = await supabase.from('point_history').insert({
          from_customer: null,
          to_customer: order.customer_id,
          points: order.points_used,
          level: 0,
          transaction_id: order_id,
          product_code: 'REFUND'
        })
        
        if (refundError) {
          console.error('Error inserting refund to point_history:', refundError)
        } else {
          console.log(`Refunded ${order.points_used} points via point_history (previous status: ${order.status})`)
        }
      }
    }

    await supabase
      .from('orders')
      .update(updateData)
      .eq('id', order_id)

    return new Response(
      JSON.stringify({ 
        success: true,
        status: updateData.status || order.status,
        digiflazz_status: status,
        sn: txData.sn,
        message: txData.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error checking status:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
