import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0'
import bcrypt from 'npm:bcryptjs@2.4.3'

function getCorsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  }
}

const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW = 15 * 60 * 1000

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

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const body = await req.json()
    const { email, password } = body

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

    // Run rate limit check and merchant_auth lookup in parallel
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW).toISOString()
    const [rateLimitResult, authResult] = await Promise.all([
      supabase
        .from('login_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('email', sanitizedEmail)
        .eq('success', false)
        .gte('attempted_at', windowStart),
      supabase
        .from('merchant_auth')
        .select('id, merchant_id, password_hash, role')
        .eq('email', sanitizedEmail)
        .single()
    ])

    const attemptCount = rateLimitResult.count
    if (attemptCount !== null && attemptCount >= RATE_LIMIT_MAX) {
      return new Response(
        JSON.stringify({ error: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const authData = authResult.data
    if (authResult.error || !authData) {
      supabase.from('login_attempts').insert({
        email: sanitizedEmail, ip_address: clientIp, success: false
      }).then(() => {})
      return new Response(
        JSON.stringify({ error: 'Email atau password salah' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const isValidPassword = await bcrypt.compare(password, authData.password_hash)

    if (!isValidPassword) {
      supabase.from('login_attempts').insert({
        email: sanitizedEmail, ip_address: clientIp, success: false
      }).then(() => {})
      return new Response(
        JSON.stringify({ error: 'Email atau password salah' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update last login (non-blocking)
    supabase.from('merchant_auth').update({ last_login: new Date().toISOString() }).eq('id', authData.id).then(() => {})

    // Run merchant data fetch and auth user sync in parallel
    const [merchantResult, existingUsersResult] = await Promise.all([
      supabase
        .from('merchants')
        .select('id, name, email, whatsapp, business_name, business_address, is_active, created_at')
        .eq('id', authData.merchant_id)
        .single(),
      supabase.auth.admin.listUsers({ page: 1, perPage: 1, filter: sanitizedEmail })
    ])

    const merchant = merchantResult.data
    if (merchantResult.error || !merchant) {
      return new Response(
        JSON.stringify({ error: 'Data mitra tidak ditemukan' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!merchant.is_active) {
      return new Response(
        JSON.stringify({ error: 'Akun mitra Anda tidak aktif. Hubungi admin.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log successful login (non-blocking)
    supabase.from('login_attempts').insert({
      email: sanitizedEmail, ip_address: clientIp, success: true
    }).then(() => {})

    // Sync auth user
    const existingUser = existingUsersResult.data?.users?.[0]
    if (existingUser?.id) {
      await supabase.auth.admin.updateUserById(existingUser.id, {
        password, email_confirm: true, user_metadata: { merchant_id: merchant.id },
      })
    } else {
      await supabase.auth.admin.createUser({
        email: sanitizedEmail, password, email_confirm: true, user_metadata: { merchant_id: merchant.id },
      })
    }

    // Sign in to get session tokens
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    if (!anonKey) {
      return new Response(
        JSON.stringify({ error: 'Konfigurasi autentikasi belum lengkap.' }),
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
      return new Response(
        JSON.stringify({ error: 'Login berhasil diverifikasi, tetapi gagal membuat sesi.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Merchant logged in: ${sanitizedEmail}`)

    return new Response(
      JSON.stringify({
        success: true,
        merchant: { ...merchant, merchant_role: authData.role },
        session: signInData.session,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Merchant login error:', error)
    return new Response(
      JSON.stringify({ error: 'Terjadi kesalahan server' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
