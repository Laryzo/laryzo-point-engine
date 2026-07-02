import { serviceClient, requireCustomer } from '../_shared/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  // AUTH: caller must be the customer whose wallet is being debited.
  const caller = await requireCustomer(req)
  if (!caller) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = serviceClient()

  try {
    const { amount, order_id, description } = await req.json()
    const customer_id = caller.customer_id
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) {
      return new Response(JSON.stringify({ success: false, error: 'Data tidak valid' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: wb } = await supabase.from('wallet_balances')
      .select('id, balance').eq('user_id', customer_id).eq('user_type', 'customer').maybeSingle()

    if (!wb || Number(wb.balance) < amt) {
      return new Response(JSON.stringify({ success: false, error: 'Saldo tidak cukup' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { error: uErr } = await supabase.from('wallet_balances')
      .update({ balance: Number(wb.balance) - amt, updated_at: new Date().toISOString() })
      .eq('id', wb.id)
    if (uErr) {
      return new Response(JSON.stringify({ success: false, error: uErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await supabase.from('wallet_transactions').insert({
      wallet_id: wb.id, amount: -amt, type: 'debit',
      reference_order_id: order_id || null,
      description: description || 'Debit saldo',
    })

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || 'Server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
