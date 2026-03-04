import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0'
import bcrypt from 'npm:bcryptjs@2.4.3'

function getCorsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
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

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    // Verify caller is a merchant super_admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user?.email) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if caller is merchant super_admin
    const { data: callerAuth, error: callerError } = await supabase
      .from('merchant_auth')
      .select('id, merchant_id, role')
      .eq('email', user.email.toLowerCase())
      .single()

    if (callerError || !callerAuth || callerAuth.role !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Hanya super admin mitra yang bisa mengelola karyawan' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { action } = body

    if (action === 'list') {
      // List all employees for this merchant
      const { data: employees, error } = await supabase
        .from('merchant_auth')
        .select('id, email, role, created_at, last_login')
        .eq('merchant_id', callerAuth.merchant_id)
        .order('created_at', { ascending: true })

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, employees }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'create') {
      const { email, password, name } = body

      if (!email || !password || password.length < 6) {
        return new Response(
          JSON.stringify({ error: 'Email dan password (min 6 karakter) wajib diisi' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const sanitizedEmail = email.toLowerCase().trim()

      // Check if email already exists
      const { data: existing } = await supabase
        .from('merchant_auth')
        .select('id')
        .eq('email', sanitizedEmail)
        .single()

      if (existing) {
        return new Response(
          JSON.stringify({ error: 'Email sudah digunakan' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const salt = await bcrypt.genSalt(10)
      const hashedPassword = await bcrypt.hash(password, salt)

      const { error: insertError } = await supabase
        .from('merchant_auth')
        .insert({
          merchant_id: callerAuth.merchant_id,
          email: sanitizedEmail,
          password_hash: hashedPassword,
          role: 'admin',
        })

      if (insertError) throw insertError

      // Create Supabase Auth user
      await supabase.auth.admin.createUser({
        email: sanitizedEmail,
        password,
        email_confirm: true,
        user_metadata: { merchant_id: callerAuth.merchant_id },
      })

      console.log(`Merchant employee created: ${sanitizedEmail} by ${user.email}`)

      return new Response(
        JSON.stringify({ success: true }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'delete') {
      const { employee_id } = body

      if (!employee_id) {
        return new Response(
          JSON.stringify({ error: 'employee_id wajib diisi' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Prevent deleting self
      if (employee_id === callerAuth.id) {
        return new Response(
          JSON.stringify({ error: 'Tidak bisa menghapus akun sendiri' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verify employee belongs to same merchant
      const { data: employee } = await supabase
        .from('merchant_auth')
        .select('id, email, merchant_id')
        .eq('id', employee_id)
        .eq('merchant_id', callerAuth.merchant_id)
        .single()

      if (!employee) {
        return new Response(
          JSON.stringify({ error: 'Karyawan tidak ditemukan' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Delete auth record
      const { error: deleteError } = await supabase
        .from('merchant_auth')
        .delete()
        .eq('id', employee_id)

      if (deleteError) throw deleteError

      console.log(`Merchant employee deleted: ${employee.email} by ${user.email}`)

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Action tidak valid' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Merchant employee error:', error)
    return new Response(
      JSON.stringify({ error: 'Terjadi kesalahan server' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
