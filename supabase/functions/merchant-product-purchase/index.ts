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
    const { product_id, delivery_type, delivery_address, delivery_notes } = await req.json();

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

    const pointPrice = Number(product.point_price || product.price);
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

    // Get merchant info for pickup address
    const { data: merchant } = await supabase
      .from("merchants")
      .select("business_address, business_name")
      .eq("id", product.merchant_id)
      .single();

    // Determine delivery fields
    const effectiveDeliveryType = delivery_type || "none";
    const effectiveDeliveryStatus = effectiveDeliveryType === "external_ojol" ? "waiting_driver" : null;
    const pickupAddr = merchant?.business_address || null;

    // Create order in orders table
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        customer_id: customerId,
        product_id: product_id,
        points_used: pointPrice,
        points_earned: 0,
        status: "processing",
        order_type: "food",
        delivery_type: effectiveDeliveryType,
        delivery_address: effectiveDeliveryType === "external_ojol" ? delivery_address : null,
        delivery_notes: delivery_notes || null,
        delivery_status: effectiveDeliveryStatus,
        pickup_address: pickupAddr,
        merchant_id: product.merchant_id,
      })
      .select("id")
      .single();

    if (orderErr) {
      console.error("Order insert error:", orderErr);
      return new Response(JSON.stringify({ error: "Gagal membuat pesanan" }), {
        status: 500,
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
      // Rollback order
      await supabase.from("orders").delete().eq("id", order.id);
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
      JSON.stringify({ success: true, message: "Pembelian berhasil", order_id: order.id }),
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
