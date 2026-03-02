import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface RequestBody {
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
    console.warn('Blocked auth-reset-request from unauthorized origin:', origin)
    return new Response(
      JSON.stringify({ error: 'Origin not allowed' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const { email }: RequestBody = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if admin exists
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('id, email, name')
      .eq('email', email)
      .single();

    if (adminError || !admin) {
      return new Response(
        JSON.stringify({ error: 'Admin not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Generate random 6-digit token
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiry time (15 minutes from now)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Store token in database (you may want to create a password_reset_tokens table)
    const { error: tokenError } = await supabase
      .from('password_reset_tokens')
      .upsert({
        admin_id: admin.id,
        token,
        email,
        expires_at: expiresAt,
        used: false
      });

    if (tokenError) {
      console.error('Error storing token:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate reset token' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Send email with token
    const emailResponse = await resend.emails.send({
      from: "Laryzo <no-reply@laryzo.biz.id>",
      to: [email],
      subject: "Reset Password - Laryzo Point Engine",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Reset Password</h2>
          <p>Halo ${admin.name},</p>
          <p>Anda telah meminta reset password untuk akun Laryzo Point Engine.</p>
          <p>Gunakan token berikut untuk mereset password Anda:</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h1 style="color: #333; font-size: 32px; margin: 0; letter-spacing: 4px;">${token}</h1>
          </div>
          <p><strong>PENTING:</strong></p>
          <ul>
            <li>Token ini berlaku selama 15 menit</li>
            <li>Token hanya dapat digunakan sekali</li>
            <li>Jangan bagikan token ini kepada siapapun</li>
          </ul>
          <p>Jika Anda tidak meminta reset password, abaikan email ini.</p>
          <p>Terima kasih,<br>Tim Laryzo</p>
        </div>
      `,
    });

    if (emailResponse.error) {
      console.error('Email error:', emailResponse.error);
      return new Response(
        JSON.stringify({ error: 'Failed to send reset email' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Reset token sent successfully:', emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Reset token sent to email',
        expires_at: expiresAt 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error in auth-reset-request function:', error);
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
