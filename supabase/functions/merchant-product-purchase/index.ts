import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Haversine formula to calculate distance between two GPS coordinates
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Gojek standard shipping cost
function calculateGojekShipping(distanceKm: number): number {
  if (distanceKm <= 0) return 0;
  if (distanceKm <= 3) return 10000;
  if (distanceKm <= 7) return 15000;
  if (distanceKm <= 12) return 22000;
  return 22000 + Math.ceil(distanceKm - 12) * 3000;
}

const SHIPPING_FEE_PERCENTAGE = 0.20; // 20% fee from shipping cost = Laryzo margin
const POINT_PERCENTAGE = 0.01; // 1% per level for point engine
const MAX_UPLINE_LEVELS = 10;

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
    const { product_id, delivery_type, delivery_address, delivery_notes, delivery_latitude, delivery_longitude, item_notes } = await req.json();

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

    // Get merchant info for pickup address and GPS
    const { data: merchant } = await supabase
      .from("merchants")
      .select("business_address, business_name, latitude, longitude")
      .eq("id", product.merchant_id)
      .single();

    // Determine delivery fields
    const effectiveDeliveryType = delivery_type || "none";
    const effectiveDeliveryStatus = effectiveDeliveryType === "external_ojol" ? "waiting_driver" : null;
    const pickupAddr = merchant?.business_address || null;

    // Calculate distance and shipping cost if both GPS coordinates available
    let estimatedDistanceKm: number | null = null;
    let estimatedShippingCost: number | null = null;
    let shippingFee = 0; // 20% fee from shipping = Laryzo margin

    // Use provided GPS or fallback to customer's saved GPS
    const effectiveDeliveryLat = delivery_latitude || null;
    const effectiveDeliveryLng = delivery_longitude || null;

    if (effectiveDeliveryType === "external_ojol" &&
        merchant?.latitude && merchant?.longitude &&
        effectiveDeliveryLat && effectiveDeliveryLng) {
      estimatedDistanceKm = Math.round(
        haversineDistance(
          Number(merchant.latitude), Number(merchant.longitude),
          Number(effectiveDeliveryLat), Number(effectiveDeliveryLng)
        ) * 10
      ) / 10;
      estimatedShippingCost = calculateGojekShipping(estimatedDistanceKm);
      shippingFee = Math.round(estimatedShippingCost * SHIPPING_FEE_PERCENTAGE);
    }

    // Total points to deduct = product price + full shipping cost
    const totalPointsDeducted = pointPrice + (estimatedShippingCost || 0);

    // Check customer points
    const { data: customer } = await supabase
      .from("customers")
      .select("points, points_blocked, name, parent_id, latitude, longitude")
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

    if ((customer.points || 0) < totalPointsDeducted) {
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

    // Create order in orders table
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        customer_id: customerId,
        points_used: totalPointsDeducted,
        points_earned: 0,
        status: "processing",
        order_type: "food",
        delivery_type: effectiveDeliveryType,
        delivery_address: effectiveDeliveryType === "external_ojol" ? delivery_address : null,
        delivery_notes: delivery_notes || null,
        delivery_status: effectiveDeliveryStatus,
        pickup_address: pickupAddr,
        merchant_id: product.merchant_id,
        estimated_distance_km: estimatedDistanceKm,
        estimated_shipping_cost: estimatedShippingCost,
        delivery_latitude: effectiveDeliveryType === "external_ojol" ? delivery_latitude : null,
        delivery_longitude: effectiveDeliveryType === "external_ojol" ? delivery_longitude : null,
        item_notes: item_notes || null,
        product_name: product.name,
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

    // Deduct total points (product + shipping) via point_history
    const merchantName = merchant?.business_name || 'Merchant';
    const { error: histErr } = await supabase.from("point_history").insert({
      to_customer: customerId,
      from_customer: customerId,
      points: -totalPointsDeducted,
      product_code: `Beli: ${product.name}`,
      level: 0,
      description: estimatedShippingCost 
        ? `Pembelian ${product.name} di ${merchantName} (termasuk ongkir Rp ${estimatedShippingCost.toLocaleString('id-ID')})`
        : `Pembelian ${product.name} di ${merchantName}`,
    });

    if (histErr) {
      console.error("point_history insert error:", histErr);
      await supabase.from("orders").delete().eq("id", order.id);
      return new Response(JSON.stringify({ error: "Gagal mengurangi poin" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all customers for upline traversal (used by both product and shipping point distribution)
    const { data: allCustomers } = await supabase
      .from("customers")
      .select("id, parent_id, points_blocked");
    const customerMap = new Map<string, any>();
    allCustomers?.forEach((c: any) => customerMap.set(c.id, c));

    // --- Distribute points from PRODUCT MARGIN (price - cost_price) ---
    const productMargin = Number(product.price || 0) - Number(product.cost_price || 0);
    if (productMargin > 0) {
      const pointsPerLevel = productMargin * POINT_PERCENTAGE;
      const productPointRecords: any[] = [];

      // Level 0: self
      const selfCustomer = customerMap.get(customerId);
      if (selfCustomer && !selfCustomer.points_blocked) {
        productPointRecords.push({
          from_customer: customerId,
          to_customer: customerId,
          level: 0,
          points: pointsPerLevel,
          product_code: `MITRA-${product.name.substring(0, 20)}`,
          description: `Bonus poin ${product.name}`,
        });
      }

      // Levels 1-10: uplines
      let currentId = customerId;
      for (let level = 1; level <= MAX_UPLINE_LEVELS; level++) {
        const current = customerMap.get(currentId);
        if (!current || !current.parent_id) break;
        const parent = customerMap.get(current.parent_id);
        if (parent && !parent.points_blocked) {
          productPointRecords.push({
            from_customer: customerId,
            to_customer: current.parent_id,
            level,
            points: pointsPerLevel,
            product_code: `MITRA-${product.name.substring(0, 20)}`,
            description: `Bonus jaringan level ${level}`,
          });
        }
        currentId = current.parent_id;
      }

      if (productPointRecords.length > 0) {
        const { error: ptErr } = await supabase.from("point_history").insert(productPointRecords);
        if (ptErr) {
          console.error("Product point distribution error:", ptErr);
        }
      }
    }

    // --- Distribute points from 20% SHIPPING FEE as Laryzo margin ---
    if (shippingFee > 0) {
      const pointsPerLevel = shippingFee * POINT_PERCENTAGE;
      const shippingPointRecords: any[] = [];

      // Level 0: self
      const selfCustomer = customerMap.get(customerId);
      if (selfCustomer && !selfCustomer.points_blocked) {
        shippingPointRecords.push({
          from_customer: customerId,
          to_customer: customerId,
          level: 0,
          points: pointsPerLevel,
          product_code: `ONGKIR-${product.name.substring(0, 20)}`,
          description: `Bonus poin ongkir ${product.name}`,
        });
      }

      // Levels 1-10: uplines
      let currentId2 = customerId;
      for (let level = 1; level <= MAX_UPLINE_LEVELS; level++) {
        const current = customerMap.get(currentId2);
        if (!current || !current.parent_id) break;
        const parent = customerMap.get(current.parent_id);
        if (parent && !parent.points_blocked) {
          shippingPointRecords.push({
            from_customer: customerId,
            to_customer: current.parent_id,
            level,
            points: pointsPerLevel,
            product_code: `ONGKIR-${product.name.substring(0, 20)}`,
            description: `Bonus jaringan ongkir level ${level}`,
          });
        }
        currentId2 = current.parent_id;
      }

      if (shippingPointRecords.length > 0) {
        const { error: ptErr } = await supabase.from("point_history").insert(shippingPointRecords);
        if (ptErr) {
          console.error("Shipping point distribution error:", ptErr);
        }
      }
    }

    // Insert into merchant_transactions so it appears in merchant's transaction history
    const laryzoFee = productMargin > 0 ? Math.round(productMargin * 0.05) : 0;
    const { error: mtxErr } = await supabase.from("merchant_transactions").insert({
      merchant_id: product.merchant_id,
      product_id: product_id,
      product_name: product.name,
      customer_id: customerId,
      customer_name: customer.name || 'Customer',
      price: pointPrice,
      qty: 1,
      total: pointPrice,
      laryzo_fee: laryzoFee,
      customer_points_earned: 0,
      notes: item_notes || null,
    });
    if (mtxErr) {
      console.error("merchant_transactions insert error:", mtxErr);
    }

    // Decrease stock if not unlimited
    if (product.stock !== -1) {
      await supabase
        .from("merchant_products")
        .update({ stock: product.stock - 1 })
        .eq("id", product_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Pembelian berhasil",
        order_id: order.id,
        total_points_used: totalPointsDeducted,
        product_price: pointPrice,
        shipping_cost: estimatedShippingCost,
        shipping_fee_laryzo: shippingFee,
        estimated_distance_km: estimatedDistanceKm,
      }),
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
