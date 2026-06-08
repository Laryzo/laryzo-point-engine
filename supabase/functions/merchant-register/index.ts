import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0'
import bcrypt from 'npm:bcryptjs@2.4.3'

// CORS configuration - allow all origins for custom domains
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

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { name, email, password, whatsapp, business_name, business_address } = body

    // Input validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'Nama harus minimal 2 karakter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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

    if (!whatsapp || typeof whatsapp !== 'string' || whatsapp.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: 'Nomor WhatsApp tidak valid' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!business_name || typeof business_name !== 'string' || business_name.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'Nama bisnis harus minimal 2 karakter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const sanitizedEmail = email.toLowerCase().trim()

    // Check if email already exists in merchant_auth
    const { data: existingAuth, error: checkError } = await supabase
      .from('merchant_auth')
      .select('id')
      .eq('email', sanitizedEmail)
      .maybeSingle()

    if (checkError) {
      console.error('Error checking existing auth:', checkError)
    }

    if (existingAuth) {
      return new Response(
        JSON.stringify({ error: 'Email sudah terdaftar' }),
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
    // Use 'super_admin' for self-registered merchants (owners)
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
      // Rollback merchant creation if auth fails
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
      // We don't throw here to avoid failing if user exists in auth but not in merchant tables
      // This allows syncing existing auth users with the merchant system
    }

    console.log(`Merchant registered: ${sanitizedEmail}`)

    return new Response(
      JSON.stringify({ success: true, message: 'Pendaftaran mitra berhasil' }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in merchant-register:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Terjadi kesalahan server' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
