import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = [
  'https://lovable.dev',
  'https://jkqtqxwtyqrlhblnaohz.lovableproject.com',
  'https://laryzo.biz.id',
  'http://localhost:5173',
  'http://localhost:3000',
]

function isOriginAllowed(origin: string | null): boolean {
  return !!origin && ALLOWED_ORIGINS.some((allowed) =>
    origin === allowed || origin.endsWith('.lovable.dev') || origin.endsWith('.lovableproject.com') || origin.endsWith('.lovable.app'),
  )
}

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': isOriginAllowed(origin) ? origin! : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const headers = { ...corsHeaders(origin), 'Content-Type': 'application/json' }

  if (req.method === 'OPTIONS') return new Response(null, { headers })
  if (!isOriginAllowed(origin)) return new Response(JSON.stringify({ error: 'Origin not allowed' }), { status: 403, headers })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!supabaseUrl || !serviceRoleKey || !anonKey) throw new Error('Supabase environment is not configured')

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized — admin token required' }), { status: 401, headers })
    }

    const anonClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.slice('Bearer '.length))
    if (authError || !user?.email) {
      return new Response(JSON.stringify({ error: 'Unauthorized — invalid token' }), { status: 401, headers })
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey)
    const { data: adminRow, error: adminError } = await serviceClient
      .from('admins')
      .select('email')
      .eq('email', user.email.toLowerCase())
      .maybeSingle()
    if (adminError) throw adminError
    if (!adminRow) return new Response(JSON.stringify({ error: 'Forbidden — admin only' }), { status: 403, headers })

    const body = await req.json().catch(() => ({}))
    const transactionId = typeof body.transaction_id === 'string' ? body.transaction_id : ''
    if (!transactionId) return new Response(JSON.stringify({ error: 'transaction_id is required' }), { status: 400, headers })

    const forceRecalculate = body.force_recalculate === true
    const rpcName = forceRecalculate ? 'replace_transaction_points' : 'distribute_transaction_points'
    const { data, error } = await serviceClient.rpc(rpcName, { _transaction_id: transactionId })
    if (error) {
      console.error(`Point distribution failed for ${transactionId}:`, error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
    }

    return new Response(JSON.stringify(data), { status: 200, headers })
  } catch (error) {
    console.error('Error in calculate-points:', error)
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return new Response(JSON.stringify({ error: message }), { status: 500, headers })
  }
})
