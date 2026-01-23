import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { hash, compare } from 'https://esm.sh/bcryptjs@3.0.2'

// CORS configuration - restrict to trusted origins
const ALLOWED_ORIGINS = [
  'https://lovable.dev',
  'https://jkqtqxwtyqrlhblnaohz.lovableproject.com',
  'http://localhost:5173',
  'http://localhost:3000',
]

// Check if password has been leaked using HaveIBeenPwned API (k-anonymity)
async function isPasswordLeaked(password: string): Promise<boolean> {
  try {
    // Create SHA-1 hash of password
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    
    // Split hash: first 5 chars for API, rest for comparison
    const prefix = hashHex.substring(0, 5);
    const suffix = hashHex.substring(5);
    
    // Query HIBP API with k-anonymity
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' }
    });
    
    if (!response.ok) {
      console.warn('HIBP API error:', response.status);
      return false; // Fail open - don't block if API is down
    }
    
    const text = await response.text();
    const lines = text.split('\n');
    
    // Check if our hash suffix is in the results
    for (const line of lines) {
      const [hashSuffix] = line.split(':');
      if (hashSuffix.trim() === suffix) {
        return true; // Password found in leak database
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking HIBP:', error);
    return false; // Fail open
  }
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || origin.endsWith('.lovable.dev') || origin.endsWith('.lovableproject.com') || origin.endsWith('.lovable.app')
  )
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  }
}

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false
  return ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || origin.endsWith('.lovable.dev') || origin.endsWith('.lovableproject.com') || origin.endsWith('.lovable.app')
  )
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Validate origin
  if (!isOriginAllowed(origin)) {
    console.warn('Blocked customer-change-password request from unauthorized origin:', origin)
    return new Response(
      JSON.stringify({ error: 'Origin not allowed' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.warn('Invalid authentication token')
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { currentPassword, newPassword } = await req.json()

    // Validate input
    if (!currentPassword || !newPassword) {
      return new Response(
        JSON.stringify({ error: 'Current password and new password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (newPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password minimal 6 karakter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (newPassword.length > 128) {
      return new Response(
        JSON.stringify({ error: 'Password terlalu panjang' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get customer auth record by email
    const { data: authData, error: fetchError } = await supabase
      .from('customer_auth')
      .select('id, password_hash, customer_id')
      .eq('email', user.email)
      .single()

    if (fetchError || !authData) {
      console.warn('Customer auth record not found for:', user.email)
      return new Response(
        JSON.stringify({ error: 'Data autentikasi tidak ditemukan' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify current password SERVER-SIDE
    const isValidPassword = await compare(currentPassword, authData.password_hash)
    if (!isValidPassword) {
      console.warn('Invalid current password for customer:', authData.customer_id)
      return new Response(
        JSON.stringify({ error: 'Password saat ini salah' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if new password has been leaked
    const isLeaked = await isPasswordLeaked(newPassword)
    if (isLeaked) {
      console.warn('Attempted to use leaked password for customer:', authData.customer_id)
      return new Response(
        JSON.stringify({ error: 'Password ini terdeteksi pernah bocor di database leak. Silakan gunakan password lain yang lebih aman.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Hash new password SERVER-SIDE
    const hashedPassword = await hash(newPassword, 10)

    // Update password
    const { error: updateError } = await supabase
      .from('customer_auth')
      .update({ password_hash: hashedPassword, updated_at: new Date().toISOString() })
      .eq('id', authData.id)

    if (updateError) {
      console.error('Failed to update password:', updateError)
      return new Response(
        JSON.stringify({ error: 'Gagal mengubah password' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Password changed successfully for customer:', authData.customer_id)

    return new Response(
      JSON.stringify({ success: true, message: 'Password berhasil diubah' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in customer-change-password:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
