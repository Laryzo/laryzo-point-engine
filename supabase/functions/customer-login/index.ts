import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0'
import bcrypt from 'npm:bcryptjs@2.4.3'

// CORS configuration - allow all origins for custom domains
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
    const { email, password, action, name, whatsapp } = body

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
      console.log(`Rate limit exceeded for ${sanitizedEmail}`)
      return new Response(
        JSON.stringify({ error: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle registration
    if (action === 'register') {
      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        return new Response(
          JSON.stringify({ error: 'Nama harus minimal 2 karakter' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if email already exists
      const { data: existingAuth } = await supabase
        .from('customer_auth')
        .select('id')
        .eq('email', sanitizedEmail)
        .single()

      if (existingAuth) {
        return new Response(
          JSON.stringify({ error: 'Email sudah terdaftar' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Find available slot in binary tree
      const { data: allCustomers } = await supabase
        .from('customers')
        .select('id, name, parent_id')
        .order('created_at', { ascending: true })

      let parentId: string | null = null
      let position: 'left' | 'right' | null = null

      if (allCustomers && allCustomers.length > 0) {
        // Find first available slot using BFS
        const queue = allCustomers.filter(c => !c.parent_id)

        while (queue.length > 0) {
          const current = queue.shift()!

          const { data: children } = await supabase
            .from('customers')
            .select('position')
            .eq('parent_id', current.id)

          const hasLeft = children?.some(c => c.position === 'left') || false
          const hasRight = children?.some(c => c.position === 'right') || false

          if (!hasLeft) {
            parentId = current.id
            position = 'left'
            break
          } else if (!hasRight) {
            parentId = current.id
            position = 'right'
            break
          } else {
            const currentChildren = allCustomers.filter(c => c.parent_id === current.id)
            queue.push(...currentChildren)
          }
        }
      }

      // Create customer
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          name: name.trim(),
          email: sanitizedEmail,
          whatsapp: whatsapp?.trim() || null,
          points: 0,
          parent_id: parentId,
          position: position
        })
        .select('id, name, email, whatsapp, points, created_at')
        .single()

      if (customerError) {
        console.error('Failed to create customer:', customerError)
        return new Response(
          JSON.stringify({ error: 'Gagal membuat akun' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Hash password and create auth record
      const salt = await bcrypt.genSalt(10)
      const hashedPassword = await bcrypt.hash(password, salt)

      const { error: authError } = await supabase
        .from('customer_auth')
        .insert({
          customer_id: newCustomer.id,
          email: sanitizedEmail,
          password_hash: hashedPassword
        })

      if (authError) {
        // Rollback customer creation
        await supabase.from('customers').delete().eq('id', newCustomer.id)
        console.error('Failed to create customer auth:', authError)
        return new Response(
          JSON.stringify({ error: 'Gagal membuat akun' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create Supabase Auth user
      await supabase.auth.admin.createUser({
        email: sanitizedEmail,
        password: password,
        email_confirm: true,
        user_metadata: { customer_id: newCustomer.id }
      })

      // Log successful registration
      await supabase.from('login_attempts').insert({
        email: sanitizedEmail,
        ip_address: clientIp,
        success: true
      })

      console.log(`Customer registered: ${sanitizedEmail}`)

      return new Response(
        JSON.stringify({
          success: true,
          customer: newCustomer
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Login flow
    const { data: authData, error: authError } = await supabase
      .from('customer_auth')
      .select('id, customer_id, password_hash')
      .eq('email', sanitizedEmail)
      .single()

    if (authError || !authData) {
      await supabase.from('login_attempts').insert({
        email: sanitizedEmail,
        ip_address: clientIp,
        success: false
      })

      console.log(`Customer login failed - not found: ${sanitizedEmail}`)
      return new Response(
        JSON.stringify({ error: 'Email atau password salah' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, authData.password_hash)

    if (!isValidPassword) {
      await supabase.from('login_attempts').insert({
        email: sanitizedEmail,
        ip_address: clientIp,
        success: false
      })

      console.log(`Customer login failed - invalid password: ${sanitizedEmail}`)
      return new Response(
        JSON.stringify({ error: 'Email atau password salah' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update last login
    await supabase
      .from('customer_auth')
      .update({ last_login: new Date().toISOString() })
      .eq('id', authData.id)

    // Fetch customer data
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, name, email, whatsapp, points, created_at')
      .eq('id', authData.customer_id)
      .single()

    if (customerError || !customer) {
      return new Response(
        JSON.stringify({ error: 'Data customer tidak ditemukan' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log successful login
    await supabase.from('login_attempts').insert({
      email: sanitizedEmail,
      ip_address: clientIp,
      success: true
    })

    console.log(`Customer logged in: ${sanitizedEmail}`)

    return new Response(
      JSON.stringify({
        success: true,
        customer: customer
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Customer login error:', error)
    return new Response(
      JSON.stringify({ error: 'Terjadi kesalahan server' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
