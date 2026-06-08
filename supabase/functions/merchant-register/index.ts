import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0'
import bcrypt from 'npm:bcryptjs@2.4.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
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

    if (!name || !email || !password || !whatsapp || !business_name) {
      return new Response(
        JSON.stringify({ error: 'Nama, email, password, whatsapp, dan nama bisnis wajib diisi' }),
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
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      throw new Error(`Gagal membuat data merchant: ${merchantError.message}`)
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
      throw new Error(`Gagal membuat data autentikasi: ${authError.message}`)
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
