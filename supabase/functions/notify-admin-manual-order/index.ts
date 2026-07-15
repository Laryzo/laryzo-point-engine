import { createClient } from 'npm:@supabase/supabase-js@2'
import { requireAdmin, isServiceRole } from '../_shared/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  // AUTH: allow either an internal service-role invocation (this function is
  // called by digiflazz-topup on fallback) OR an authenticated admin.
  if (!isServiceRole(req)) {
    const admin = await requireAdmin(req)
    if (!admin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendKey = Deno.env.get('RESEND_API_KEY')
    const supabase = createClient(supabaseUrl, serviceKey)

    const body = await req.json()
    const order_id = body.order_id
    const hintOrderType = body.order_type as string | undefined

    if (!order_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'order_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Ambil detail order + customer + product
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single()

    if (!order) {
      return new Response(
        JSON.stringify({ success: false, error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const [{ data: customer }, { data: product }, { data: admins }] = await Promise.all([
      supabase.from('customers').select('name, whatsapp, email, address').eq('id', order.customer_id).single(),
      supabase.from('products').select('name, digiflazz_sku').eq('id', order.product_id).single(),
      supabase.from('admins').select('email, name'),
    ])

    // Determine order type: prefer explicit hint, fall back to DB record
    const orderType = hintOrderType || order.order_type || 'ppob'
    const isPhysical = orderType === 'product'

    const shortId = String(order.id).slice(0, 8).toUpperCase()
    const customerWa = (customer?.whatsapp || '').replace(/[^0-9]/g, '')
    const waCustomerLink = customerWa
      ? `https://wa.me/${customerWa.startsWith('0') ? '62' + customerWa.slice(1) : customerWa}`
      : ''

    const adminEmails = (admins || []).map((a: any) => a.email).filter(Boolean)

    // Build context-aware subject, title, and body
    const typeLabel = isPhysical ? 'Produk Fisik' : 'PPOB'
    const subject = `[URGENT] Order ${typeLabel} Manual - ${customer?.name || 'Customer'} - ${product?.name || ''}`
    const headerTitle = isPhysical
      ? 'Order Produk Fisik Perlu Proses Manual'
      : 'Order PPOB Perlu Proses Manual'
    const headerEmoji = isPhysical ? '\u{1F4E6}' : '\u26A0\uFE0F'
    const introText = isPhysical
      ? 'Ada order produk fisik yang perlu diproses manual oleh admin:'
      : 'Ada order PPOB yang gagal otomatis ke Digiflazz dan dialihkan untuk diproses manual:'

    // Build detail rows based on order type
    const detailRows: string[] = []
    detailRows.push(`<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb"><b>Order ID</b></td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${shortId}</td></tr>`)
    detailRows.push(`<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb"><b>Customer</b></td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${customer?.name || '-'}</td></tr>`)
    detailRows.push(`<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb"><b>WhatsApp</b></td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${customer?.whatsapp || '-'}</td></tr>`)
    detailRows.push(`<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb"><b>Produk</b></td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${product?.name || '-'}${!isPhysical ? ` (${product?.digiflazz_sku || '-'})` : ''}</td></tr>`)

    if (isPhysical) {
      // Physical product: show delivery address, maps link, qty, notes
      detailRows.push(`<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb"><b>Alamat Pengiriman</b></td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${order.delivery_address || customer?.address || '-'}</td></tr>`)
      if (order.delivery_latitude && order.delivery_longitude) {
        const mapsUrl = `https://www.google.com/maps?q=${order.delivery_latitude},${order.delivery_longitude}`
        detailRows.push(`<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb"><b>Lokasi</b></td><td style="padding:8px;border-bottom:1px solid #e5e7eb"><a href="${mapsUrl}">Buka di Google Maps</a></td></tr>`)
      }
      if (order.item_notes) {
        detailRows.push(`<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb"><b>Catatan Item</b></td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${order.item_notes}</td></tr>`)
      }
      if (order.admin_notes) {
        detailRows.push(`<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb"><b>Catatan Admin</b></td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${order.admin_notes}</td></tr>`)
      }
      detailRows.push(`<tr><td style="padding:8px"><b>Total Harga</b></td><td style="padding:8px">Rp ${Number(order.input_value || 0).toLocaleString('id-ID')}</td></tr>`)
    } else {
      // PPOB: show target number, points, reason
      detailRows.push(`<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb"><b>Nomor Tujuan</b></td><td style="padding:8px;border-bottom:1px solid #e5e7eb"><b>${order.input_value || '-'}</b></td></tr>`)
      detailRows.push(`<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb"><b>Total Poin</b></td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${Number(order.points_used).toLocaleString('id-ID')}</td></tr>`)
      detailRows.push(`<tr><td style="padding:8px"><b>Alasan</b></td><td style="padding:8px">${order.digiflazz_message || 'Digiflazz tidak terhubung'}</td></tr>`)
    }

    // Build steps based on order type
    const stepsHtml = isPhysical
      ? `<ol>
          <li>Siapkan produk sesuai jumlah yang dipesan</li>
          <li>Kirim produk via kurir/ojol ke alamat customer</li>
          <li>Hubungi customer untuk konfirmasi pengiriman</li>
          <li>Tandai sukses di menu Manajemen Pesanan</li>
        </ol>`
      : `<ol>
          <li>Proses transaksi via Digiflazz dashboard / provider lain</li>
          <li>Hubungi customer untuk konfirmasi</li>
          <li>Tandai sukses di menu Manajemen Pesanan agar poin terdistribusi</li>
        </ol>`

    // Build action buttons
    const mapsButton = isPhysical && order.delivery_latitude && order.delivery_longitude
      ? `<a href="https://www.google.com/maps?q=${order.delivery_latitude},${order.delivery_longitude}" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin-right:8px">\u{1F4CD} Buka Lokasi</a>`
      : ''
    const chatButton = waCustomerLink
      ? `<a href="${waCustomerLink}" style="display:inline-block;background:#22c55e;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin-right:8px">\u{1F4AC} Chat Customer</a>`
      : ''

    const headerColor = isPhysical ? '#3b82f6' : '#f97316'

    if (resendKey && adminEmails.length > 0) {
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:20px;background:#fff">
          <div style="background:${headerColor};color:#fff;padding:16px;border-radius:8px 8px 0 0">
            <h2 style="margin:0">${headerEmoji} ${headerTitle}</h2>
          </div>
          <div style="border:1px solid #e5e7eb;border-top:0;padding:20px;border-radius:0 0 8px 8px">
            <p>Halo Admin,</p>
            <p>${introText}</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0">
              ${detailRows.join('')}
            </table>
            <p><b>Langkah:</b></p>
            ${stepsHtml}
            <div style="text-align:center;margin:24px 0">
              ${mapsButton}${chatButton}
            </div>
            <p style="color:#6b7280;font-size:12px;margin-top:24px">Email otomatis dari sistem Laryzo. Jangan balas email ini.</p>
          </div>
        </div>
      `

      // Kirim ke semua admin
      try {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Laryzo Sistem <no-reply@laryzo.biz.id>',
            to: adminEmails,
            subject,
            html,
          }),
        })
        const resendBody = await resendRes.text()
        console.log(`Notifikasi admin terkirim (${resendRes.status}) ke ${adminEmails.length} admin:`, resendBody)
      } catch (mailErr) {
        console.error('Resend gagal:', mailErr)
      }
    } else {
      console.warn(`Lewati email: resendKey=${!!resendKey}, adminCount=${adminEmails.length}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        notified: adminEmails.length,
        order_short_id: shortId,
        order_type: orderType,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('notify-admin-manual-order error:', err)
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
