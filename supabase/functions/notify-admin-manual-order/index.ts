import { createClient } from 'npm:@supabase/supabase-js@2'
import { requireAdmin, isServiceRole } from '../_shared/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
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

    const { order_id } = await req.json()
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
      supabase.from('customers').select('name, whatsapp, email').eq('id', order.customer_id).single(),
      supabase.from('products').select('name, digiflazz_sku').eq('id', order.product_id).single(),
      supabase.from('admins').select('email, name'),
    ])

    const shortId = String(order.id).slice(0, 8).toUpperCase()
    const customerWa = (customer?.whatsapp || '').replace(/[^0-9]/g, '')
    const waCustomerLink = customerWa
      ? `https://wa.me/${customerWa.startsWith('0') ? '62' + customerWa.slice(1) : customerWa}`
      : ''

    const adminEmails = (admins || []).map((a: any) => a.email).filter(Boolean)

    if (resendKey && adminEmails.length > 0) {
      const subject = `[URGENT] PPOB Manual - ${customer?.name || 'Customer'} - ${product?.name || ''}`
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:20px;background:#fff">
          <div style="background:#f97316;color:#fff;padding:16px;border-radius:8px 8px 0 0">
            <h2 style="margin:0">⚠️ Order PPOB Perlu Proses Manual</h2>
          </div>
          <div style="border:1px solid #e5e7eb;border-top:0;padding:20px;border-radius:0 0 8px 8px">
            <p>Halo Admin,</p>
            <p>Ada order PPOB yang gagal otomatis ke Digiflazz dan dialihkan untuk diproses manual:</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0">
              <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb"><b>Order ID</b></td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${shortId}</td></tr>
              <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb"><b>Customer</b></td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${customer?.name || '-'}</td></tr>
              <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb"><b>WhatsApp</b></td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${customer?.whatsapp || '-'}</td></tr>
              <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb"><b>Produk</b></td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${product?.name || '-'} (${product?.digiflazz_sku || '-'})</td></tr>
              <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb"><b>Nomor Tujuan</b></td><td style="padding:8px;border-bottom:1px solid #e5e7eb"><b>${order.input_value || '-'}</b></td></tr>
              <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb"><b>Total Poin</b></td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${Number(order.points_used).toLocaleString('id-ID')}</td></tr>
              <tr><td style="padding:8px"><b>Alasan</b></td><td style="padding:8px">${order.digiflazz_message || 'Digiflazz tidak terhubung'}</td></tr>
            </table>
            <p><b>Langkah:</b></p>
            <ol>
              <li>Proses transaksi via Digiflazz dashboard / provider lain</li>
              <li>Hubungi customer untuk konfirmasi</li>
              <li>Tandai sukses di menu Manajemen Pesanan agar poin terdistribusi</li>
            </ol>
            <div style="text-align:center;margin:24px 0">
              ${waCustomerLink ? `<a href="${waCustomerLink}" style="display:inline-block;background:#22c55e;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin-right:8px">💬 Chat Customer</a>` : ''}
            </div>
            <p style="color:#6b7280;font-size:12px;margin-top:24px">Email otomatis dari sistem Laryzo. Jangan balas email ini.</p>
          </div>
        </div>
      `

      // Kirim ke semua admin (bcc supaya tidak saling lihat)
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
