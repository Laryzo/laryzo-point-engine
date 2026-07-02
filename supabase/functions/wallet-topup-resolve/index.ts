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
      return new Response(JSON.stringify({ error: error?.message || 'Permintaan tidak ditemukan / sudah diproses' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
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
