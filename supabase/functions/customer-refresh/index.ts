import { serviceClient, requireCustomer } from '../_shared/auth.ts'

function getCorsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // AUTH: derive customer_id from the authenticated JWT — never from the body.
  const caller = await requireCustomer(req)
  if (!caller) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
  const customer_id = caller.customer_id

  const supabase = serviceClient()

  try {
    // Fetch latest customer data
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, name, email, whatsapp, points, created_at, latitude, longitude, address')
      .eq('id', customer_id)
      .single()

    if (customerError || !customer) {
      console.error('Customer not found:', customerError)
      return new Response(
        JSON.stringify({ error: 'Customer tidak ditemukan' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: wallet } = await supabase
      .from('wallet_balances')
      .select('balance')
      .eq('user_id', customer_id)
      .eq('user_type', 'customer')
      .maybeSingle()

    return new Response(
      JSON.stringify({
        success: true,
        customer: { ...customer, balance: Number(wallet?.balance || 0) }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Customer refresh error:', error)
    return new Response(
      JSON.stringify({ error: 'Terjadi kesalahan server' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
