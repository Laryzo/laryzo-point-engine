import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Authenticate customer via token
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await anonClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get customer from email
    const { data: custAuth } = await supabase
      .from("customer_auth")
      .select("customer_id")
      .eq("email", user.email)
      .single();

    if (!custAuth) {
      return new Response(JSON.stringify({ error: "Customer not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerId = custAuth.customer_id;
    const { product_id } = await req.json();

    if (!product_id) {
      return new Response(JSON.stringify({ error: "product_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get merchant product
    const { data: product, error: prodErr } = await supabase
      .from("merchant_products")
      .select("*")
      .eq("id", product_id)
      .eq("is_active", true)
      .single();

    if (prodErr || !product) {
      return new Response(JSON.stringify({ error: "Product not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pointPrice = Number(product.price);
    if (pointPrice <= 0) {
      return new Response(JSON.stringify({ error: "Product cannot be purchased with points" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check customer points
    const { data: customer } = await supabase
      .from("customers")
      .select("points, points_blocked, name")
      .eq("id", customerId)
      .single();

    if (!customer) {
      return new Response(JSON.stringify({ error: "Customer not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (customer.points_blocked) {
      return new Response(JSON.stringify({ error: "Akun poin Anda diblokir" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((customer.points || 0) < pointPrice) {
      return new Response(JSON.stringify({ error: "Poin tidak cukup" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check stock
    if (product.stock !== -1 && product.stock <= 0) {
      return new Response(JSON.stringify({ error: "Stok habis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduct points via point_history insert (trigger auto-syncs customer.points)
    const { error: histErr } = await supabase.from("point_history").insert({
      to_customer: customerId,
      from_customer: customerId,
      points: -pointPrice,
      product_code: `Beli: ${product.name}`,
      level: 0,
    });

    if (histErr) {
      console.error("point_history insert error:", histErr);
      return new Response(JSON.stringify({ error: "Gagal mengurangi poin" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Decrease stock if not unlimited
    if (product.stock !== -1) {
      await supabase
        .from("merchant_products")
        .update({ stock: product.stock - 1 })
        .eq("id", product_id);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Pembelian berhasil" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("merchant-product-purchase error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
