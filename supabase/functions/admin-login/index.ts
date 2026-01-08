import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0'
import bcrypt from 'npm:bcryptjs@2.4.3'

// CORS configuration - restrict to trusted origins
const ALLOWED_ORIGINS = [
  'https://lovable.dev',
  'https://jkqtqxwtyqrlhblnaohz.lovableproject.com',
  'http://localhost:5173',
  'http://localhost:3000',
]

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || origin.endsWith('.lovable.dev') || origin.endsWith('.lovableproject.com') || origin.endsWith('.lovable.app')
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
    origin === allowed || origin.endsWith('.lovable.dev') || origin.endsWith('.lovableproject.com') || origin.endsWith('.lovable.app')
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
    const body = await req.json()
    const { email, password, action, name } = body

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

      const adminName = name || sanitizedEmail.split('@')[0]

      // Hash password using bcryptjs
      const salt = bcrypt.genSaltSync(10)
      const hashedPassword = bcrypt.hashSync(password, salt)

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

      // Ensure auth user exists and can sign in with password
      const { data: createdUserData, error: createUserError } = await supabase.auth.admin.createUser({
        email: sanitizedEmail,
        password: password,
        email_confirm: true,
        user_metadata: { admin_id: newAdmin.id, role: newAdmin.role },
      })

      if (createUserError && !createUserError.message.includes('already been registered')) {
        console.error('Failed to create auth user:', createUserError)
      }

      // Sign in using anon client to obtain session tokens (required for RLS)
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      if (!anonKey) {
        return new Response(
          JSON.stringify({ error: 'Konfigurasi autentikasi belum lengkap (ANON key).' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const supabaseAnon = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        anonKey
      )

      const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
        email: sanitizedEmail,
        password,
      })

      if (signInError || !signInData.session) {
        console.error('Failed to sign in after registration:', signInError)
        return new Response(
          JSON.stringify({ error: 'Registrasi berhasil, tetapi gagal membuat sesi login.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
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
          session: signInData.session,
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

    // Verify password using bcryptjs (synchronous, no Workers needed)
    console.log(`Verifying password for ${sanitizedEmail}...`)
    
    // Normalize bcrypt hash prefix for compatibility ($2a$ vs $2b$)
    // bcryptjs uses $2a$ but some implementations use $2b$ - they are functionally equivalent
    let normalizedHash = admin.password_hash
    if (normalizedHash.startsWith('$2b$')) {
      normalizedHash = '$2a$' + normalizedHash.substring(4)
    }
    
    const isValidPassword = bcrypt.compareSync(password, normalizedHash)

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

     // Ensure auth user exists and password is synced so we can sign in and get JWT
     const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers({
       page: 1,
       perPage: 1000,
     })

     if (usersError) {
       console.error('Failed to list auth users:', usersError)
     }

     const existingUser = usersData?.users?.find(u => (u.email || '').toLowerCase() === sanitizedEmail)

     if (existingUser?.id) {
       const { error: updateUserError } = await supabase.auth.admin.updateUserById(existingUser.id, {
         password,
         email_confirm: true,
         user_metadata: { admin_id: admin.id, role: admin.role },
       })

       if (updateUserError) {
         console.error('Failed to update auth user password:', updateUserError)
       }
     } else {
       const { error: createError } = await supabase.auth.admin.createUser({
         email: sanitizedEmail,
         password,
         email_confirm: true,
         user_metadata: { admin_id: admin.id, role: admin.role },
       })

       if (createError && !createError.message.includes('already been registered')) {
         console.error('Failed to create auth user:', createError)
       }
     }

     // Sign in using anon client to obtain session tokens (required for RLS)
     const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
     if (!anonKey) {
       return new Response(
         JSON.stringify({ error: 'Konfigurasi autentikasi belum lengkap (ANON key).' }),
         { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       )
     }

     const supabaseAnon = createClient(
       Deno.env.get('SUPABASE_URL') ?? '',
       anonKey
     )

     const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
       email: sanitizedEmail,
       password,
     })

     if (signInError || !signInData.session) {
       console.error('Failed to sign in:', signInError)
       return new Response(
         JSON.stringify({ error: 'Login berhasil diverifikasi, tetapi gagal membuat sesi.' }),
         { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       )
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
         admin: safeAdmin,
         session: signInData.session,
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
