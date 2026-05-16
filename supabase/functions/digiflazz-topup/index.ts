import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHash } from 'node:crypto'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface Order {
  id: string
  customer_id: string
  product_id: string
  points_used: number
  wallet_used: number
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

/**
 * Try to mark order as manual_pending (WA fallback) if enabled in system_settings.
 * Returns true if fallback was applied (poin TIDAK di-refund), false otherwise.
 */
async function tryWhatsAppFallback(
  supabase: any,
  orderId: string,
  refId: string,
  reason: string
): Promise<{ applied: boolean; admin_wa?: string }> {
  try {
    const { data: settings } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['ppob_fallback_enabled', 'admin_ppob_wa_number'])

    const map = (settings || []).reduce((acc: Record<string, string>, s: any) => {
      acc[s.key] = s.value
      return acc
    }, {})

    const enabled = map.ppob_fallback_enabled === 'true' || map.ppob_fallback_enabled === '1'
    const adminWa = (map.admin_ppob_wa_number || '').trim()

    if (!enabled || !adminWa) {
      return { applied: false }
    }

    await supabase
      .from('orders')
      .update({
        status: 'manual_pending',
        digiflazz_status: 'manual_fallback',
        digiflazz_message: `Dialihkan ke admin (WhatsApp): ${reason}`,
        ref_id: refId,
      })
      .eq('id', orderId)

    console.log(`Order ${orderId} dialihkan ke fallback WA admin: ${adminWa}`)

    // Fire-and-forget notifikasi ke admin (email)
    try {
      supabase.functions.invoke('notify-admin-manual-order', {
        body: { order_id: orderId },
      }).then(({ error }: any) => {
        if (error) console.error('notify-admin-manual-order invoke error:', error)
      })
    } catch (notifyErr) {
      console.error('Gagal trigger notifikasi admin:', notifyErr)
    }

    return { applied: true, admin_wa: adminWa }
  } catch (err) {
    console.error('tryWhatsAppFallback error:', err)
    return { applied: false }
  }
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

    const walletUsed = Number(order.wallet_used || 0)
    const pointsUsed = Number(order.points_used || 0)

    // Verify customer has enough points
    if (customer.points < pointsUsed) {
      return new Response(
        JSON.stringify({ success: false, error: 'Insufficient points' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify wallet balance if walletUsed > 0
    let walletId: string | null = null
    if (walletUsed > 0) {
      const { data: wb } = await supabase
        .from('wallet_balances')
        .select('id, balance')
        .eq('user_id', customer.id)
        .eq('user_type', 'customer')
        .maybeSingle()
      if (!wb || Number(wb.balance) < walletUsed) {
        return new Response(
          JSON.stringify({ success: false, error: 'Saldo tidak cukup' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      walletId = wb.id
    }

    // Verify total covers product price
    if (walletUsed + pointsUsed < Number(product.point_price)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Pembayaran tidak cukup' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate unique ref_id
    const refId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Deduct points (if any)
    if (pointsUsed > 0) {
      const { data: deductSuccess, error: deductError } = await supabase.rpc(
        'increment_customer_points',
        { customer_uuid: customer.id, points_to_add: -pointsUsed }
      )
      if (deductError || !deductSuccess) {
        return new Response(
          JSON.stringify({ success: false, error: 'Gagal mengurangi poin' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Debit wallet (if any)
    if (walletUsed > 0 && walletId) {
      const { error: wErr } = await supabase
        .from('wallet_balances')
        .update({ balance: (await supabase.from('wallet_balances').select('balance').eq('id', walletId).single()).data!.balance - walletUsed, updated_at: new Date().toISOString() })
        .eq('id', walletId)
      if (wErr) {
        // refund points
        if (pointsUsed > 0) await supabase.rpc('increment_customer_points', { customer_uuid: customer.id, points_to_add: pointsUsed })
        return new Response(JSON.stringify({ success: false, error: 'Gagal mendebit saldo' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      await supabase.from('wallet_transactions').insert({
        wallet_id: walletId, amount: -walletUsed, type: 'debit',
        reference_order_id: order_id, description: `Pembayaran ${product.name}`,
      })
    }

    // Points have been deducted - from here, any error should trigger a refund
    let pointsDeducted = true
    const refundAll = async (reason: string) => {
      if (pointsUsed > 0) {
        await supabase.from('point_history').insert({
          from_customer: null, to_customer: customer.id, points: pointsUsed,
          level: 0, transaction_id: null, product_code: 'REFUND',
          description: `Refund poin - ${reason}`,
        })
      }
      if (walletUsed > 0 && walletId) {
        const cur = await supabase.from('wallet_balances').select('balance').eq('id', walletId).single()
        await supabase.from('wallet_balances').update({ balance: Number(cur.data?.balance || 0) + walletUsed, updated_at: new Date().toISOString() }).eq('id', walletId)
        await supabase.from('wallet_transactions').insert({
          wallet_id: walletId, amount: walletUsed, type: 'credit',
          reference_order_id: order_id, description: `Refund saldo - ${reason}`,
        })
      }
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
        // Failed - try WhatsApp fallback first
        const fallback = await tryWhatsAppFallback(
          supabase,
          order_id,
          refId,
          txData.message || txData.rc || 'Digiflazz menolak transaksi'
        )

        if (fallback.applied) {
          // Don't refund — order moves to manual_pending, admin will resolve
          pointsDeducted = false // mark as "handled" so outer catch doesn't double-refund
          return new Response(
            JSON.stringify({
              success: true,
              status: 'manual_pending',
              manual_fallback: true,
              admin_wa: fallback.admin_wa,
              ref_id: refId,
              message: 'Pesanan dialihkan ke admin (WhatsApp)'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // No fallback — refund as usual
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
      // Error occurred after points were deducted (network/Digiflazz down)
      console.error('Error after point deduction:', innerError)

      if (pointsDeducted) {
        // Try WhatsApp fallback first
        const fallback = await tryWhatsAppFallback(
          supabase,
          order_id,
          refId,
          innerError.message || 'Tidak bisa terhubung ke Digiflazz'
        )

        if (fallback.applied) {
          pointsDeducted = false
          return new Response(
            JSON.stringify({
              success: true,
              status: 'manual_pending',
              manual_fallback: true,
              admin_wa: fallback.admin_wa,
              ref_id: refId,
              message: 'Pesanan dialihkan ke admin (WhatsApp)'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // No fallback — refund as usual
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
