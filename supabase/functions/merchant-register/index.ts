import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0'
import bcrypt from 'npm:bcryptjs@2.4.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    const { name, email, password, whatsapp, business_name, business_address } = await req.json()

    if (!name || !email || !password || !whatsapp || !business_name) {
      return new Response(
        JSON.stringify({ error: 'Nama, email, password, whatsapp, dan nama bisnis wajib diisi' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const sanitizedEmail = email.toLowerCase().trim()

    // Check if email already exists in merchants or merchant_auth
    const { data: existingAuth } = await supabase
      .from('merchant_auth')
      .select('id')
      .eq('email', sanitizedEmail)
      .maybeSingle()

    if (existingAuth) {
      return new Response(
        JSON.stringify({ error: 'Email sudah terdaftar' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // 1. Create Merchant
    const { data: newMerchant, error: merchantError } = await supabase
      .from('merchants')
      .insert({
        name: name.trim(),
        email: sanitizedEmail,
        whatsapp: whatsapp.trim(),
        business_name: business_name.trim(),
        business_address: business_address?.trim() || '',
        is_active: true // Auto-active for now, or set to false if admin approval is needed
      })
      .select('id')
      .single()

    if (merchantError) throw merchantError

    // 2. Create Merchant Auth
    const { error: authError } = await supabase
      .from('merchant_auth')
      .insert({
        merchant_id: newMerchant.id,
        email: sanitizedEmail,
        password_hash: hashedPassword,
        role: 'admin'
      })

    if (authError) throw authError

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
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Pendaftaran mitra berhasil' }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in merchant-register:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
