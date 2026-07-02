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
    const { amount, bank_account_id } = await req.json()

    if (!amount || !bank_account_id) {
      return new Response(JSON.stringify({ error: 'Data tidak lengkap' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) {
      return new Response(JSON.stringify({ error: 'Jumlah tidak valid' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: minSetting } = await supabase
      .from('system_settings').select('value').eq('key', 'min_topup_amount').maybeSingle()
    const minAmount = Number(minSetting?.value || 10000)
    if (amt < minAmount) {
      return new Response(JSON.stringify({ error: `Minimum top up Rp ${minAmount.toLocaleString('id-ID')}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: customer } = await supabase
      .from('customers').select('id, name').eq('id', customer_id).maybeSingle()
    if (!customer) {
      return new Response(JSON.stringify({ error: 'Customer tidak ditemukan' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: bank } = await supabase
      .from('bank_accounts').select('*').eq('id', bank_account_id).eq('is_active', true).maybeSingle()
    if (!bank) {
      return new Response(JSON.stringify({ error: 'Rekening tidak ditemukan' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let unique_code = 0
    let transfer_amount = 0
    for (let i = 0; i < 20; i++) {
      const code = Math.floor(Math.random() * 900) + 100
      const ta = amt + code
      const { data: dup } = await supabase
        .from('topup_requests')
        .select('id')
        .eq('status', 'pending')
        .eq('transfer_amount', ta)
        .maybeSingle()
      if (!dup) { unique_code = code; transfer_amount = ta; break }
    }
    if (!unique_code) {
      return new Response(JSON.stringify({ error: 'Gagal generate kode unik, coba lagi' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: req_, error: insErr } = await supabase
      .from('topup_requests')
      .insert({
        customer_id,
        amount: amt,
        unique_code,
        transfer_amount,
        bank_account_id: bank.id,
        bank_snapshot: {
          bank_name: bank.bank_name,
          account_number: bank.account_number,
          account_holder: bank.account_holder,
        },
        status: 'pending',
      })
      .select('*').single()

    if (insErr) {
      console.error('Insert error:', insErr)
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, request: req_ }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    console.error('wallet-topup-create error:', e)
    return new Response(JSON.stringify({ error: e?.message || 'Server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
