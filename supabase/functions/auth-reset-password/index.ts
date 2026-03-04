import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

// CORS configuration - restrict to trusted origins
const ALLOWED_ORIGINS = [
  'https://lovable.dev',
  'https://jkqtqxwtyqrlhblnaohz.lovableproject.com',
  'https://laryzo.biz.id',
  'http://localhost:5173',
  'http://localhost:3000',
]

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || origin.endsWith('.lovable.dev') || origin.endsWith('.lovableproject.com') || origin.endsWith('.lovable.app')
  )
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface RequestBody {
  token: string;
  newPassword: string;
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate origin for non-preflight requests
  if (!isOriginAllowed(origin)) {
    console.warn('Blocked auth-reset-password request from unauthorized origin:', origin)
    return new Response(
      JSON.stringify({ error: 'Origin not allowed' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const { token, newPassword, email }: RequestBody = await req.json();

    if (!token || !newPassword || !email) {
      return new Response(
        JSON.stringify({ error: 'Token, email, and new password are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (newPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Find valid token
    const { data: tokenData, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .eq('email', email)
      .eq('used', false)
      .single();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    
    if (now > expiresAt) {
      return new Response(
        JSON.stringify({ error: 'Token has expired' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update admin password
    const { error: updateError } = await supabase
      .from('admins')
      .update({ password_hash: hashedPassword })
      .eq('id', tokenData.admin_id);

    if (updateError) {
      console.error('Error updating password:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update password' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Mark token as used
    const { error: markUsedError } = await supabase
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('id', tokenData.id);

    if (markUsedError) {
      console.error('Error marking token as used:', markUsedError);
    }

    console.log('Password reset successfully for admin:', tokenData.admin_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Password reset successfully' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error in auth-reset-password function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
};

serve(handler);
