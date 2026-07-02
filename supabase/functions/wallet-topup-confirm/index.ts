import { serviceClient, requireCustomer } from '../_shared/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  // AUTH: derive customer_id from JWT — never from the body.
  const caller = await requireCustomer(req)
  if (!caller) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const customer_id = caller.customer_id

  const supabase = serviceClient()

  try {
    const { request_id } = await req.json()
    if (!request_id) {
      return new Response(JSON.stringify({ error: 'Data tidak lengkap' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: req_, error } = await supabase
      .from('topup_requests')
      .update({ customer_confirmed_at: new Date().toISOString() })
      .eq('id', request_id)
      .eq('customer_id', customer_id)
      .eq('status', 'pending')
      .select('*').single()

    if (error || !req_) {
      return new Response(JSON.stringify({ error: error?.message || 'Permintaan tidak ditemukan' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: customer } = await supabase
      .from('customers').select('name, email, whatsapp').eq('id', customer_id).maybeSingle()

    const bank = req_.bank_snapshot as any || {}

    const { data: emailSetting } = await supabase
      .from('system_settings').select('value').eq('key', 'admin_topup_email').maybeSingle()
    let adminEmail = emailSetting?.value?.trim()
    if (!adminEmail) {
      const { data: admin } = await supabase
        .from('admins').select('email').eq('role', 'super_admin').limit(1).maybeSingle()
      adminEmail = admin?.email
    }

    const RESEND_KEY = Deno.env.get('RESEND_API_KEY')
    if (adminEmail && RESEND_KEY) {
      const html = `
        <h2>Permintaan Top Up Saldo Baru</h2>
        <p><b>Nama:</b> ${customer?.name || '-'}</p>
        <p><b>Email:</b> ${customer?.email || '-'}</p>
        <p><b>WhatsApp:</b> ${customer?.whatsapp || '-'}</p>
        <hr/>
        <p><b>Jumlah Top Up:</b> Rp ${Number(req_.amount).toLocaleString('id-ID')}</p>
        <p><b>Kode Unik:</b> ${req_.unique_code}</p>
        <p><b>Total Transfer:</b> Rp ${Number(req_.transfer_amount).toLocaleString('id-ID')}</p>
        <p><b>Bank:</b> ${bank.bank_name} - ${bank.account_number} a.n. ${bank.account_holder}</p>
        <p><b>Waktu Konfirmasi:</b> ${new Date().toLocaleString('id-ID')}</p>
        <p>Silakan login ke dashboard admin untuk approve/reject permintaan ini.</p>
      `
      try {
        const resp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_KEY}` },
          body: JSON.stringify({
            from: 'Laryzo <no-reply@laryzo.biz.id>',
            to: [adminEmail],
            subject: `[TOP UP] ${customer?.name} - Rp ${Number(req_.transfer_amount).toLocaleString('id-ID')}`,
            html,
          }),
        })
        if (!resp.ok) console.error('Resend failed:', await resp.text())
      } catch (e) { console.error('Email error:', e) }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    console.error('wallet-topup-confirm error:', e)
    return new Response(JSON.stringify({ error: e?.message || 'Server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
