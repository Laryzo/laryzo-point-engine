import { serviceClient, requireAdmin } from '../_shared/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  // AUTH: caller must be an authenticated admin. admin_email is derived from
  // the verified JWT — never accepted from the body.
  const admin = await requireAdmin(req)
  if (!admin) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const admin_email = admin.email

  const supabase = serviceClient()

  try {
    const { request_id, action, admin_notes } = await req.json()
    if (!request_id || !action) {
      return new Response(JSON.stringify({ error: 'Data tidak lengkap' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!['approve', 'reject'].includes(action)) {
      return new Response(JSON.stringify({ error: 'Action tidak valid' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected'

    const { data: updated, error } = await supabase
      .from('topup_requests')
      .update({
        status: newStatus,
        processed_by: admin_email,
        processed_at: new Date().toISOString(),
        admin_notes: admin_notes || null,
      })
      .eq('id', request_id)
      .eq('status', 'pending')
      .select('*').single()

    if (error || !updated) {
      return new Response(JSON.stringify({ error: error?.message || 'Permintaan tidak ditemukan' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'approve') {
      // Credit wallet
      const { data: wb } = await supabase
        .from('wallet_balances')
        .select('id, balance')
        .eq('user_id', updated.customer_id)
        .eq('user_type', 'customer')
        .maybeSingle()

      if (wb) {
        await supabase.from('wallet_balances')
          .update({ balance: Number(wb.balance) + Number(updated.amount), updated_at: new Date().toISOString() })
          .eq('id', wb.id)
        await supabase.from('wallet_transactions').insert({
          wallet_id: wb.id, amount: Number(updated.amount), type: 'topup',
          description: `Top up disetujui - ${updated.unique_code}`,
        })
      } else {
        const { data: newWb } = await supabase.from('wallet_balances')
          .insert({ user_id: updated.customer_id, user_type: 'customer', balance: Number(updated.amount) })
          .select('id').single()
        if (newWb) {
          await supabase.from('wallet_transactions').insert({
            wallet_id: newWb.id, amount: Number(updated.amount), type: 'topup',
            description: `Top up disetujui - ${updated.unique_code}`,
          })
        }
      }
    }

    return new Response(JSON.stringify({ success: true, request: updated }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    console.error('wallet-topup-resolve error:', e)
    return new Response(JSON.stringify({ error: e?.message || 'Server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
