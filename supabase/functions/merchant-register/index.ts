import { createClient } from 'npm:@supabase/supabase-js@2'
import bcrypt from 'npm:bcryptjs@2.4.3'

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

  console.log(`Request received: ${req.method} ${req.url}`)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables')
    return new Response(
      JSON.stringify({ error: 'Server configuration missing' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let body;
    try {
      body = await req.json()
    } catch (e) {
      console.error('Failed to parse request body:', e)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { name, email, password, whatsapp, business_name, business_address } = body
    console.log(`Registering merchant: ${email}`)

    if (!name || !email || !password || !whatsapp || !business_name) {
      return new Response(
        JSON.stringify({ error: 'Data pendaftaran tidak lengkap. Semua field wajib diisi.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password minimal 6 karakter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const sanitizedEmail = email.toLowerCase().trim()

    // Check if email already exists
    const { data: existingAuth } = await supabase
      .from('merchant_auth')
      .select('id')
      .eq('email', sanitizedEmail)
      .maybeSingle()

    if (existingAuth) {
      return new Response(
        JSON.stringify({ error: 'Email sudah terdaftar sebagai mitra' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Hash password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // 1. Create Merchant
    const { data: newMerchant, error: merchantError } = await supabase
      .from('merchants')
      .insert({
        name: name.trim(),
        email: sanitizedEmail,
        whatsapp: whatsapp.trim(),
        business_name: business_name.trim(),
        business_address: business_address?.trim() || '',
        is_active: true
      })
      .select('id')
      .single()

    if (merchantError) {
      console.error('Merchant creation error:', merchantError)
      return new Response(
        JSON.stringify({ error: `Gagal membuat data merchant: ${merchantError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Create Merchant Auth
    const { error: authError } = await supabase
      .from('merchant_auth')
      .insert({
        merchant_id: newMerchant.id,
        email: sanitizedEmail,
        password_hash: hashedPassword,
        role: 'super_admin'
      })

    if (authError) {
      console.error('Merchant auth creation error:', authError)
      await supabase.from('merchants').delete().eq('id', newMerchant.id)
      return new Response(
        JSON.stringify({ error: `Gagal membuat data autentikasi: ${authError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Create Supabase Auth User
    const { error: authUserError } = await supabase.auth.admin.createUser({
      email: sanitizedEmail,
      password: password,
      email_confirm: true,
      user_metadata: { role: 'merchant', merchant_id: newMerchant.id },
    })

    if (authUserError && !authUserError.message.includes('already been registered')) {
      console.error('Auth user creation error:', authUserError)
    }

    // 4. Create Session
    let session = null
    if (supabaseAnonKey) {
      try {
        const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey)
        const { data: signInData } = await supabaseAnon.auth.signInWithPassword({
          email: sanitizedEmail,
          password,
        })
        session = signInData.session
      } catch (e) {
        console.error('Auto sign-in failed:', e)
      }
    }

    console.log(`Merchant registered successfully: ${sanitizedEmail}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Pendaftaran mitra berhasil',
        merchant_id: newMerchant.id,
        session: session
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error in merchant-register:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Terjadi kesalahan server internal' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
