import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0'
import bcrypt from 'npm:bcryptjs@2.4.3'

// CORS configuration
function getCorsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  }
}

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

  try {
    // Verify super admin from JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No token provided' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Verify JWT and get claims
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await anonClient.auth.getUser(token)
    
    if (claimsError || !claimsData?.user) {
      console.error('Failed to verify token:', claimsError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const requesterEmail = claimsData.user.email?.toLowerCase()
    if (!requesterEmail) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No email in token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if requester is super_admin
    const { data: requesterAdmin, error: requesterError } = await supabase
      .from('admins')
      .select('id, role')
      .eq('email', requesterEmail)
      .single()

    if (requesterError || !requesterAdmin) {
      console.log(`Reset password denied - requester not admin: ${requesterEmail}`)
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Not an admin' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (requesterAdmin.role !== 'super_admin') {
      console.log(`Reset password denied - not super_admin: ${requesterEmail}`)
      return new Response(
        JSON.stringify({ error: 'Forbidden - Only super admin can reset passwords' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body = await req.json()
    const { admin_id, new_password } = body

    if (!admin_id || typeof admin_id !== 'string') {
      return new Response(
        JSON.stringify({ error: 'admin_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!new_password || typeof new_password !== 'string' || new_password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password baru harus minimal 6 karakter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get target admin
    const { data: targetAdmin, error: targetError } = await supabase
      .from('admins')
      .select('id, email, name, role')
      .eq('id', admin_id)
      .single()

    if (targetError || !targetAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin tidak ditemukan' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Hash new password
    const salt = bcrypt.genSaltSync(10)
    const hashedPassword = bcrypt.hashSync(new_password, salt)

    // Update password in admins table
    const { error: updateError } = await supabase
      .from('admins')
      .update({ 
        password_hash: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', admin_id)

    if (updateError) {
      console.error('Failed to update password:', updateError)
      return new Response(
        JSON.stringify({ error: 'Gagal mengupdate password' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Also update auth user password if exists
    const { data: usersData } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })

    const existingUser = usersData?.users?.find(
      u => (u.email || '').toLowerCase() === targetAdmin.email.toLowerCase()
    )

    if (existingUser?.id) {
      await supabase.auth.admin.updateUserById(existingUser.id, {
        password: new_password,
      })
    }

    console.log(`Password reset for ${targetAdmin.email} by ${requesterEmail}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Password untuk ${targetAdmin.name || targetAdmin.email} berhasil direset`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Admin reset password error:', error)
    return new Response(
      JSON.stringify({ error: 'Terjadi kesalahan server' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
