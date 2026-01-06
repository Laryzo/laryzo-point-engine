import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0'
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts'

// CORS configuration - restrict to trusted origins
const ALLOWED_ORIGINS = [
  'https://lovable.dev',
  'https://jkqtqxwtyqrlhblnaohz.lovableproject.com',
  'http://localhost:5173',
  'http://localhost:3000',
]

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || origin.endsWith('.lovable.dev') || origin.endsWith('.lovableproject.com')
  )
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  }
}

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false
  return ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || origin.endsWith('.lovable.dev') || origin.endsWith('.lovableproject.com')
  )
}

const RATE_LIMIT_MAX = 5 // max attempts
const RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 minutes in ms

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Validate origin for non-preflight requests
  if (!isOriginAllowed(origin)) {
    console.warn('Blocked admin-login request from unauthorized origin:', origin)
    return new Response(
      JSON.stringify({ error: 'Origin not allowed' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const { email, password, action } = await req.json()

    // Input validation
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'Email tidak valid' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password harus minimal 6 karakter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const clientIp = req.headers.get('x-forwarded-for') || 'unknown'
    const sanitizedEmail = email.toLowerCase().trim()

    // Check rate limit
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW).toISOString()
    const { count: attemptCount } = await supabase
      .from('login_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('email', sanitizedEmail)
      .eq('success', false)
      .gte('attempted_at', windowStart)

    if (attemptCount !== null && attemptCount >= RATE_LIMIT_MAX) {
      console.log(`Rate limit exceeded for ${sanitizedEmail} from ${clientIp}`)
      return new Response(
        JSON.stringify({ error: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle registration for first admin
    if (action === 'register') {
      // Check if any admin exists
      const { count: adminCount } = await supabase
        .from('admins')
        .select('*', { count: 'exact', head: true })

      if (adminCount !== null && adminCount > 0) {
        return new Response(
          JSON.stringify({ error: 'Admin sudah ada. Registrasi tidak diizinkan.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { name } = await req.json().catch(() => ({ name: '' }))
      const adminName = name || sanitizedEmail.split('@')[0]

      // Hash password
      const salt = await bcrypt.genSalt(10)
      const hashedPassword = await bcrypt.hash(password, salt)

      // Create first admin as super_admin
      const { data: newAdmin, error: insertError } = await supabase
        .from('admins')
        .insert({
          email: sanitizedEmail,
          password_hash: hashedPassword,
          name: adminName,
          role: 'super_admin'
        })
        .select('id, email, name, role, created_at')
        .single()

      if (insertError) {
        console.error('Failed to create admin:', insertError)
        return new Response(
          JSON.stringify({ error: 'Gagal membuat admin: ' + insertError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Sign in to Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: sanitizedEmail,
        password: password,
        email_confirm: true,
        user_metadata: { admin_id: newAdmin.id, role: newAdmin.role }
      })

      if (authError) {
        console.error('Failed to create auth user:', authError)
      }

      // Log successful registration
      await supabase.from('login_attempts').insert({
        email: sanitizedEmail,
        ip_address: clientIp,
        success: true
      })

      console.log(`Admin registered: ${sanitizedEmail}`)

      return new Response(
        JSON.stringify({
          success: true,
          admin: newAdmin,
          session: authData?.session || null
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Login flow
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('id, email, name, role, password_hash, created_at')
      .eq('email', sanitizedEmail)
      .single()

    if (adminError || !admin) {
      // Log failed attempt
      await supabase.from('login_attempts').insert({
        email: sanitizedEmail,
        ip_address: clientIp,
        success: false
      })

      console.log(`Login failed - admin not found: ${sanitizedEmail}`)
      return new Response(
        JSON.stringify({ error: 'Email atau password salah' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.password_hash)

    if (!isValidPassword) {
      // Log failed attempt
      await supabase.from('login_attempts').insert({
        email: sanitizedEmail,
        ip_address: clientIp,
        success: false
      })

      console.log(`Login failed - invalid password: ${sanitizedEmail}`)
      return new Response(
        JSON.stringify({ error: 'Email atau password salah' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Sign in to Supabase Auth to get a proper JWT
    const { data: authData, error: signInError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: sanitizedEmail,
      options: {
        data: { admin_id: admin.id, role: admin.role }
      }
    })

    // Try to create auth user if not exists
    if (!authData) {
      const { data: createUserData, error: createError } = await supabase.auth.admin.createUser({
        email: sanitizedEmail,
        password: password,
        email_confirm: true,
        user_metadata: { admin_id: admin.id, role: admin.role }
      })

      if (createError && !createError.message.includes('already been registered')) {
        console.error('Failed to create auth user:', createError)
      }
    }

    // Log successful login
    await supabase.from('login_attempts').insert({
      email: sanitizedEmail,
      ip_address: clientIp,
      success: true
    })

    console.log(`Admin logged in: ${sanitizedEmail}`)

    // Return admin without password hash
    const { password_hash, ...safeAdmin } = admin

    return new Response(
      JSON.stringify({
        success: true,
        admin: safeAdmin
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Admin login error:', error)
    return new Response(
      JSON.stringify({ error: 'Terjadi kesalahan server' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
