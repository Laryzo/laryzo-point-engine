import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0'
import bcrypt from 'npm:bcryptjs@2.4.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Generate random alphanumeric password
function generatePassword(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// BFS to find next available slot in binary tree
async function findAvailableSlot(supabase: any): Promise<{ parent_id: string | null; position: string | null }> {
  const { data: allCustomers, error } = await supabase
    .from('customers')
    .select('id, parent_id, position')
    .order('created_at', { ascending: true })

  if (error || !allCustomers || allCustomers.length === 0) {
    return { parent_id: null, position: null }
  }

  // Build children map
  const childrenMap = new Map<string, { left: boolean; right: boolean }>()
  for (const c of allCustomers) {
    if (c.parent_id) {
      if (!childrenMap.has(c.parent_id)) {
        childrenMap.set(c.parent_id, { left: false, right: false })
      }
      const entry = childrenMap.get(c.parent_id)!
      if (c.position === 'left') entry.left = true
      if (c.position === 'right') entry.right = true
    }
  }

  // BFS from roots
  const roots = allCustomers.filter(c => !c.parent_id)
  const queue = [...roots]

  while (queue.length > 0) {
    const current = queue.shift()!
    const children = childrenMap.get(current.id) || { left: false, right: false }

    if (!children.left) {
      return { parent_id: current.id, position: 'left' }
    }
    if (!children.right) {
      return { parent_id: current.id, position: 'right' }
    }

    // Add children to queue in order
    const childNodes = allCustomers.filter(c => c.parent_id === current.id)
    // left first, then right
    const leftChild = childNodes.find(c => c.position === 'left')
    const rightChild = childNodes.find(c => c.position === 'right')
    if (leftChild) queue.push(leftChild)
    if (rightChild) queue.push(rightChild)
  }

  return { parent_id: null, position: null }
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
    // Verify caller is authenticated merchant
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

    // Check if caller is merchant
    const { data: merchantAuth, error: merchantError } = await supabase
      .from('merchant_auth')
      .select('id, merchant_id')
      .eq('email', user.email.toLowerCase())
      .single()

    if (merchantError || !merchantAuth) {
      return new Response(
        JSON.stringify({ error: 'Bukan akun mitra' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { name, email, whatsapp } = await req.json()

    if (!name || !email || !whatsapp) {
      return new Response(
        JSON.stringify({ error: 'Nama, email, dan WhatsApp wajib diisi' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const sanitizedEmail = email.toLowerCase().trim()

    // Check if customer already exists by email or whatsapp
    const { data: existingByEmail } = await supabase
      .from('customers')
      .select('id, name, email, whatsapp, points')
      .eq('email', sanitizedEmail)
      .maybeSingle()

    if (existingByEmail) {
      return new Response(
        JSON.stringify({ success: true, customer: existingByEmail, is_new: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: existingByWa } = await supabase
      .from('customers')
      .select('id, name, email, whatsapp, points')
      .eq('whatsapp', whatsapp.trim())
      .maybeSingle()

    if (existingByWa) {
      return new Response(
        JSON.stringify({ success: true, customer: existingByWa, is_new: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find available slot in binary tree (BFS)
    const { parent_id, position } = await findAvailableSlot(supabase)

    // Generate password
    const plainPassword = generatePassword(8)
    const hashedPassword = await bcrypt.hash(plainPassword, 10)

    // Create customer
    const { data: newCustomer, error: insertError } = await supabase
      .from('customers')
      .insert({
        name: name.trim(),
        email: sanitizedEmail,
        whatsapp: whatsapp.trim(),
        parent_id,
        position,
        plain_password: plainPassword,
      })
      .select('id, name, email, whatsapp, points')
      .single()

    if (insertError) throw insertError

    // Create customer_auth
    const { error: authInsertError } = await supabase
      .from('customer_auth')
      .insert({
        customer_id: newCustomer.id,
        email: sanitizedEmail,
        password_hash: hashedPassword,
      })

    if (authInsertError) {
      console.error('Error creating customer_auth:', authInsertError)
    }

    // Create Supabase Auth user
    const { error: authUserError } = await supabase.auth.admin.createUser({
      email: sanitizedEmail,
      password: plainPassword,
      email_confirm: true,
      user_metadata: { role: 'customer', customer_id: newCustomer.id },
    })

    if (authUserError && !authUserError.message.includes('already been registered')) {
      console.error('Auth user creation error:', authUserError)
    }

    console.log(`New customer registered from merchant POS: ${name} (${sanitizedEmail}) by merchant ${merchantAuth.merchant_id}`)

    return new Response(
      JSON.stringify({ success: true, customer: newCustomer, is_new: true, password: plainPassword }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in merchant-register-customer:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})