import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const { request_id, action, admin_email, admin_notes } = await req.json()
    if (!request_id || !action || !admin_email) {
      return new Response(JSON.stringify({ error: 'Data tidak lengkap' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!['approve', 'reject'].includes(action)) {
      return new Response(JSON.stringify({ error: 'Action tidak valid' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify admin
    const { data: admin } = await supabase
      .from('admins').select('email, role').eq('email', admin_email).maybeSingle()
    if (!admin) {
      return new Response(JSON.stringify({ error: 'Bukan admin' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
