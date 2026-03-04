import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { hash } from 'https://esm.sh/bcryptjs@3.0.2'

// CORS configuration - restrict to trusted origins
const ALLOWED_ORIGINS = [
  'https://lovable.dev',
  'https://jkqtqxwtyqrlhblnaohz.lovableproject.com',
  'https://laryzo.biz.id',
  'http://localhost:5173',
  'http://localhost:3000',
]

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || origin.endsWith('.lovable.dev') || origin.endsWith('.lovableproject.com') || origin.endsWith('.lovable.app')
  )
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  }
}

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false
  return ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || origin.endsWith('.lovable.dev') || origin.endsWith('.lovableproject.com') || origin.endsWith('.lovable.app')
  )
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Validate origin
  if (!isOriginAllowed(origin)) {
    console.warn('Blocked admin-create request from unauthorized origin:', origin)
    return new Response(
      JSON.stringify({ error: 'Origin not allowed' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get authorization header and verify caller is a super_admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.warn('Invalid authentication token')
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the caller is a super_admin
    const { data: callerAdmin, error: callerError } = await supabase
      .from('admins')
      .select('id, role')
      .eq('email', user.email)
      .single()

    if (callerError || !callerAdmin || callerAdmin.role !== 'super_admin') {
      console.warn('Non-super_admin attempted to create admin:', user.email)
      return new Response(
        JSON.stringify({ error: 'Only super admins can create new admins' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { name, email, password, role } = await req.json()

    // Validate input
    if (!name || !email || !password) {
      return new Response(
        JSON.stringify({ error: 'Name, email, and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password minimal 6 karakter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (password.length > 128) {
      return new Response(
        JSON.stringify({ error: 'Password terlalu panjang' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Format email tidak valid' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate role
    const validRole = role === 'super_admin' ? 'super_admin' : 'admin'

    // Check if email already exists
    const { data: existingAdmin } = await supabase
      .from('admins')
      .select('id')
      .eq('email', email)
      .single()

    if (existingAdmin) {
      return new Response(
        JSON.stringify({ error: 'Email sudah digunakan' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Hash password SERVER-SIDE
    const hashedPassword = await hash(password, 10)

    // Create admin record
    const { data: newAdmin, error: insertError } = await supabase
      .from('admins')
      .insert({
        name,
        email,
        password_hash: hashedPassword,
        role: validRole
      })
      .select('id, name, email, role, created_at')
      .single()

    if (insertError) {
      console.error('Failed to create admin:', insertError)
      return new Response(
        JSON.stringify({ error: 'Gagal membuat admin: ' + insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Admin created successfully:', newAdmin.id, 'by super_admin:', callerAdmin.id)

    return new Response(
      JSON.stringify({ success: true, admin: newAdmin }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in admin-create:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
