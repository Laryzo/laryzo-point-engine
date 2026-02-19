import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0'
import bcrypt from 'npm:bcryptjs@2.4.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function generatePassword(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

async function findAvailableSlot(supabase: any): Promise<{ parent_id: string | null; position: string | null }> {
  const { data: allCustomers, error } = await supabase
    .from('customers')
    .select('id, parent_id, position')
    .order('created_at', { ascending: true })

  if (error || !allCustomers || allCustomers.length === 0) {
    return { parent_id: null, position: null }
  }

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

  const roots = allCustomers.filter(c => !c.parent_id)
  const queue = [...roots]

  while (queue.length > 0) {
    const current = queue.shift()!
    const children = childrenMap.get(current.id) || { left: false, right: false }

    if (!children.left) return { parent_id: current.id, position: 'left' }
    if (!children.right) return { parent_id: current.id, position: 'right' }

    const childNodes = allCustomers.filter(c => c.parent_id === current.id)
    const leftChild = childNodes.find(c => c.position === 'left')
    const rightChild = childNodes.find(c => c.position === 'right')
    if (leftChild) queue.push(leftChild)
    if (rightChild) queue.push(rightChild)
  }

  return { parent_id: null, position: null }
}

// Send welcome email with login credentials
async function sendCredentialEmail(
  recipientEmail: string,
  customerName: string,
  customerEmail: string,
  password: string,
  merchantName: string
): Promise<void> {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    console.log('RESEND_API_KEY not set, skipping email')
    return
  }

  try {
    const { Resend } = await import('npm:resend@2.0.0')
    const resend = new Resend(resendKey)

    await resend.emails.send({
      from: 'Laryzo <no-reply@laryzo.com>',
      to: recipientEmail,
      subject: `Akun Laryzo Baru - ${customerName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #ea580c;">🎉 Selamat Datang di Laryzo!</h2>
          <p>Akun baru telah dibuat oleh <strong>${merchantName}</strong>:</p>
          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p><strong>Nama:</strong> ${customerName}</p>
            <p><strong>Email:</strong> ${customerEmail}</p>
            <p><strong>Password:</strong> ${password}</p>
          </div>
          <p>Silakan login di portal Laryzo menggunakan kredensial di atas.</p>
          <p style="color: #999; font-size: 12px;">Harap segera ubah password Anda setelah login pertama.</p>
        </div>
      `,
    })
    console.log(`Credential email sent to ${recipientEmail}`)
  } catch (e) {
    console.error('Failed to send credential email:', e)
  }
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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: userError } = await anonClient.auth.getUser(token)

    if (userError || !user?.email) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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

    // Get merchant info for email
    const { data: merchantInfo } = await supabase
      .from('merchants')
      .select('name, business_name, email')
      .eq('id', merchantAuth.merchant_id)
      .single()

    const merchantDisplayName = merchantInfo?.business_name || merchantInfo?.name || 'Mitra Laryzo'
    const merchantEmail = merchantInfo?.email || null

    const { name, email, whatsapp } = await req.json()

    if (!name || !email || !whatsapp) {
      return new Response(
        JSON.stringify({ error: 'Nama, email, dan WhatsApp wajib diisi' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const sanitizedEmail = email.toLowerCase().trim()

    // Check if customer already exists
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

    const { parent_id, position } = await findAvailableSlot(supabase)

    const plainPassword = generatePassword(8)
    const hashedPassword = await bcrypt.hash(plainPassword, 10)

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

    const { error: authUserError } = await supabase.auth.admin.createUser({
      email: sanitizedEmail,
      password: plainPassword,
      email_confirm: true,
      user_metadata: { role: 'customer', customer_id: newCustomer.id },
    })

    if (authUserError && !authUserError.message.includes('already been registered')) {
      console.error('Auth user creation error:', authUserError)
    }

    // Send credential emails (non-blocking)
    // 1. Send to customer
    sendCredentialEmail(sanitizedEmail, name.trim(), sanitizedEmail, plainPassword, merchantDisplayName)
    // 2. Send to merchant if they have an email
    if (merchantEmail) {
      sendCredentialEmail(merchantEmail, name.trim(), sanitizedEmail, plainPassword, merchantDisplayName)
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
