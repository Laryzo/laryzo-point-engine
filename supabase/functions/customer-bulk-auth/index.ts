import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "npm:bcryptjs@3.0.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

// Generate random alphanumeric password that is not leaked
async function generateSafePassword(length: number = 8, maxAttempts: number = 10): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Check if password is leaked
    const isLeaked = await isPasswordLeaked(result);
    if (!isLeaked) {
      console.log(`Generated safe password on attempt ${attempt + 1}`);
      return result;
    }
    console.warn(`Generated password was leaked, regenerating (attempt ${attempt + 1})`);
  }
  
  // Fallback: generate longer password if all attempts found leaked passwords
  console.warn('All attempts found leaked passwords, generating longer password');
  let result = '';
  for (let i = 0; i < length + 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { customer_id, email, password, action } = await req.json();

    // Action: generate-all - Generate/regenerate passwords for all customers
    if (action === "generate-all") {
      // Get all customers with email
      const { data: customers, error: customersError } = await supabase
        .from("customers")
        .select("id, name, email, whatsapp, plain_password");

      if (customersError) throw customersError;

      // Get all existing customer_auth records
      const { data: existingAuth, error: authError } = await supabase
        .from("customer_auth")
        .select("customer_id");

      if (authError) throw authError;

      const existingCustomerIds = new Set(existingAuth?.map(a => a.customer_id) || []);

      // Filter customers with email that either:
      // 1. Don't have auth yet, OR
      // 2. Have auth but plain_password is empty (need to regenerate)
      const customersToProcess = (customers || []).filter(c => 
        c.email && (!existingCustomerIds.has(c.id) || !c.plain_password)
      );

      let created = 0;
      let regenerated = 0;
      let errors = 0;
      const results: Array<{ customer_id: string; success: boolean; action?: string; error?: string }> = [];

      for (const customer of customersToProcess) {
        try {
          const generatedPassword = await generateSafePassword(8);
          const hashedPassword = await bcrypt.hash(generatedPassword, 10);
          const hasAuth = existingCustomerIds.has(customer.id);

          if (hasAuth) {
            // Update existing auth
            const { error: updateAuthError } = await supabase
              .from("customer_auth")
              .update({ password_hash: hashedPassword })
              .eq("customer_id", customer.id);

            if (updateAuthError) throw updateAuthError;

            // Update Supabase Auth user password
            const { data: users } = await supabase.auth.admin.listUsers();
            const existingUser = users?.users?.find(u => u.email === customer.email);
            if (existingUser) {
              await supabase.auth.admin.updateUserById(existingUser.id, {
                password: generatedPassword,
              });
            }

            regenerated++;
            results.push({ customer_id: customer.id, success: true, action: 'regenerated' });
          } else {
            // Create new auth
            const { error: insertError } = await supabase
              .from("customer_auth")
              .insert({
                customer_id: customer.id,
                email: customer.email,
                password_hash: hashedPassword,
              });

            if (insertError) throw insertError;

            // Create Supabase Auth user
            const { error: authUserError } = await supabase.auth.admin.createUser({
              email: customer.email,
              password: generatedPassword,
              email_confirm: true,
              user_metadata: { role: "customer", customer_id: customer.id },
            });

            if (authUserError && !authUserError.message.includes("already been registered")) {
              console.warn(`Auth user creation warning for ${customer.email}:`, authUserError.message);
            }

            created++;
            results.push({ customer_id: customer.id, success: true, action: 'created' });
          }

          // Update plain_password in customers table
          const { error: updateError } = await supabase
            .from("customers")
            .update({ plain_password: generatedPassword })
            .eq("id", customer.id);

          if (updateError) throw updateError;

        } catch (err) {
          errors++;
          results.push({ customer_id: customer.id, success: false, error: (err as Error).message });
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          created,
          regenerated,
          errors,
          total_processed: customersToProcess.length,
          results 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Single customer auth creation
    if (!customer_id || !email) {
      return new Response(
        JSON.stringify({ error: "customer_id and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if customer_auth already exists
    const { data: existingAuth } = await supabase
      .from("customer_auth")
      .select("id")
      .eq("customer_id", customer_id)
      .single();

    // If customer already has auth, regenerate password
    if (existingAuth) {
      const generatedPassword = password || await generateSafePassword(8);
      const hashedPassword = await bcrypt.hash(generatedPassword, 10);

      // Update password in customer_auth
      const { error: updateAuthError } = await supabase
        .from("customer_auth")
        .update({ password_hash: hashedPassword })
        .eq("customer_id", customer_id);

      if (updateAuthError) throw updateAuthError;

      // Update plain_password in customers table
      const { error: updateError } = await supabase
        .from("customers")
        .update({ plain_password: generatedPassword })
        .eq("id", customer_id);

      if (updateError) {
        console.error("Error updating plain_password:", updateError);
      }

      // Update Supabase Auth user password
      const { data: users } = await supabase.auth.admin.listUsers();
      const existingUser = users?.users?.find(u => u.email === email);
      if (existingUser) {
        await supabase.auth.admin.updateUserById(existingUser.id, {
          password: generatedPassword,
        });
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          customer_id,
          password_regenerated: true 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate or use provided password
    const generatedPassword = password || await generateSafePassword(8);
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    // Insert into customer_auth
    const { error: insertError } = await supabase
      .from("customer_auth")
      .insert({
        customer_id,
        email,
        password_hash: hashedPassword,
      });

    if (insertError) {
      throw insertError;
    }

    // Update plain_password in customers table
    const { error: updateError } = await supabase
      .from("customers")
      .update({ plain_password: generatedPassword })
      .eq("id", customer_id);

    if (updateError) {
      console.error("Error updating plain_password:", updateError);
    }

    // Create Supabase Auth user
    const { error: authUserError } = await supabase.auth.admin.createUser({
      email,
      password: generatedPassword,
      email_confirm: true,
      user_metadata: { role: "customer", customer_id },
    });

    // If user already exists, try to update their password
    if (authUserError) {
      if (authUserError.message.includes("already been registered")) {
        // Get user and update password
        const { data: users } = await supabase.auth.admin.listUsers();
        const existingUser = users?.users?.find(u => u.email === email);
        if (existingUser) {
          await supabase.auth.admin.updateUserById(existingUser.id, {
            password: generatedPassword,
          });
        }
      } else {
        console.error("Auth user creation error:", authUserError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        customer_id,
        password_generated: true 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in customer-bulk-auth:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
