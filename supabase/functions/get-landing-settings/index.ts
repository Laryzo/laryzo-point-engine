import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Allow both GET and POST
  if (req.method !== "GET" && req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role (backend access)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch landing page settings that should be accessible to anonymous users
    const { data: settings, error } = await supabase
      .from("system_settings")
      .select("key, value")
      .in("key", [
        "admin_ppob_wa_number",
        "ppob_fallback_enabled",
        "multibeauty_price",
        "multibeauty_product_id",
      ]);

    if (error) {
      throw error;
    }

    // Convert array to object for easier access
    const settingsMap: Record<string, string> = {};
    (settings || []).forEach((s: any) => {
      settingsMap[s.key] = s.value;
    });

    // Return only the safe settings that should be visible to anonymous users
    const response = {
      admin_ppob_wa_number: settingsMap.admin_ppob_wa_number || null,
      ppob_fallback_enabled: settingsMap.ppob_fallback_enabled === "true",
      multibeauty_price: parseInt(settingsMap.multibeauty_price || "75000") || 75000,
      multibeauty_product_id: settingsMap.multibeauty_product_id || null,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching landing settings:", error);

    return new Response(
      JSON.stringify({
        error: (error as Error).message,
        admin_ppob_wa_number: null,
        ppob_fallback_enabled: false,
        multibeauty_price: 75000,
        multibeauty_product_id: null,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
