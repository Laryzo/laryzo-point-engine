import { createClient } from "npm:@supabase/supabase-js@2";
import * as bcrypt from "npm:bcryptjs@3.0.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRICE_FALLBACK = 75000;
const PRODUCT_ID_FALLBACK = "c71687ae-af87-4afa-9729-0243ae6ace90";

function normalizeWa(input: string): string {
  const digits = (input || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("8")) return "62" + digits;
  return digits;
}

function generatePassword(length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < length; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out;
}

// BFS: find first customer with an open left/right slot, then a random choice.
async function findOpenSlot(supabase: any): Promise<{ parent_id: string; position: "left" | "right" } | null> {
  const { data: customers, error } = await supabase
    .from("customers")
    .select("id, parent_id, position, created_at")
    .order("created_at", { ascending: true });
  if (error || !customers || customers.length === 0) return null;

  // Build children map
  const childrenByParent = new Map<string, { left?: string; right?: string }>();
  for (const c of customers) {
    if (c.parent_id && c.position) {
      const entry = childrenByParent.get(c.parent_id) || {};
      entry[c.position as "left" | "right"] = c.id;
      childrenByParent.set(c.parent_id, entry);
    }
  }

  // Root = customer with no parent_id
  const root = customers.find((c: any) => !c.parent_id);
  if (!root) return null;

  const queue: string[] = [root.id];
  while (queue.length) {
    const currentId = queue.shift()!;
    const kids = childrenByParent.get(currentId) || {};
    const openPositions: ("left" | "right")[] = [];
    if (!kids.left) openPositions.push("left");
    if (!kids.right) openPositions.push("right");
    if (openPositions.length) {
      const pos = openPositions[Math.floor(Math.random() * openPositions.length)];
      return { parent_id: currentId, position: pos };
    }
    if (kids.left) queue.push(kids.left);
    if (kids.right) queue.push(kids.right);
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const name = (body.name || "").toString().trim();
    const whatsappRaw = (body.whatsapp || "").toString().trim();
    const email = (body.email || "").toString().trim().toLowerCase();
    const qty = Math.max(1, Math.min(999, parseInt(body.qty) || 1));
    const address = (body.address || "").toString().trim();
    const latitude = parseFloat(body.latitude);
    const longitude = parseFloat(body.longitude);
    const notes = (body.notes || "").toString().slice(0, 500);

    if (!name || name.length < 2) throw new Error("Nama wajib diisi");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Email tidak valid");
    const whatsapp = normalizeWa(whatsappRaw);
    if (whatsapp.length < 10) throw new Error("Nomor WhatsApp tidak valid");
    if (!address || address.length < 5) throw new Error("Alamat wajib diisi");
    if (!isFinite(latitude) || !isFinite(longitude)) throw new Error("Titik lokasi peta wajib dipilih");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Load config
    const { data: settings } = await supabase
      .from("system_settings")
      .select("key, value")
      .in("key", ["multibeauty_product_id", "multibeauty_price"]);
    const settingMap = new Map((settings || []).map((s: any) => [s.key, s.value]));
    const productId = settingMap.get("multibeauty_product_id") || PRODUCT_ID_FALLBACK;
    const price = parseInt(settingMap.get("multibeauty_price") || String(PRICE_FALLBACK)) || PRICE_FALLBACK;

    // Find or create customer by email
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id, name, email, whatsapp")
      .eq("email", email)
      .maybeSingle();

    let customerId: string;
    let generatedPassword: string | null = null;
    let isNewAccount = false;

    if (existingCustomer) {
      customerId = existingCustomer.id;
      // Refresh address + location so ojol delivery is accurate
      await supabase
        .from("customers")
        .update({
          address,
          latitude,
          longitude,
          whatsapp: whatsapp,
          updated_at: new Date().toISOString(),
        })
        .eq("id", customerId);
    } else {
      // Placement
      const slot = await findOpenSlot(supabase);
      if (!slot) throw new Error("Tidak dapat menempatkan akun di jaringan. Silakan hubungi admin.");

      const { data: newCustomer, error: insertErr } = await supabase
        .from("customers")
        .insert({
          name,
          email,
          whatsapp,
          address,
          latitude,
          longitude,
          parent_id: slot.parent_id,
          position: slot.position,
          points: 0,
        })
        .select("id")
        .single();
      if (insertErr) throw insertErr;
      customerId = newCustomer.id;
      isNewAccount = true;

      // Create auth + credentials
      generatedPassword = generatePassword(8);
      const hashed = await bcrypt.hash(generatedPassword, 10);

      const { error: authErr } = await supabase
        .from("customer_auth")
        .insert({ customer_id: customerId, email, password_hash: hashed });
      if (authErr) throw authErr;

      await supabase.from("customer_credentials").upsert(
        { customer_id: customerId, plain_password: generatedPassword, updated_at: new Date().toISOString() },
        { onConflict: "customer_id" }
      );

      // Create Supabase Auth user (for portal login via Supabase JWT)
      const { error: authUserError } = await supabase.auth.admin.createUser({
        email,
        password: generatedPassword,
        email_confirm: true,
        user_metadata: { role: "customer", customer_id: customerId },
      });
      if (authUserError && !authUserError.message.includes("already been registered")) {
        console.warn("auth user create warning:", authUserError.message);
      } else if (authUserError) {
        // Update password if account already existed
        const { data: users } = await supabase.auth.admin.listUsers();
        const existingUser = users?.users?.find((u: any) => u.email === email);
        if (existingUser) {
          await supabase.auth.admin.updateUserById(existingUser.id, { password: generatedPassword });
        }
      }
    }

    // Create order (physical product, manual_pending so admin processes it)
    const totalPrice = price * qty;
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        customer_id: customerId,
        product_id: productId,
        product_name: "Multibeauty Soap",
        order_type: "product",
        delivery_type: "ojol",
        status: "manual_pending",
        points_used: 0,
        points_earned: 0,
        wallet_used: 0,
        input_value: String(totalPrice),
        delivery_address: address,
        delivery_latitude: latitude,
        delivery_longitude: longitude,
        item_notes: `Qty: ${qty} pcs${notes ? ` | Catatan: ${notes}` : ""}`,
        admin_notes: `Order dari landing page Multibeauty (Rp ${price.toLocaleString("id-ID")} x ${qty} = Rp ${totalPrice.toLocaleString("id-ID")}).`,
      })
      .select("id, created_at")
      .single();
    if (orderErr) throw orderErr;

    // Fire-and-forget notify admin (do not block on failure)
    try {
      await supabase.functions.invoke("notify-admin-manual-order", {
        body: { order_id: order.id, source: "multibeauty-landing" },
      });
    } catch (e) {
      console.warn("notify-admin-manual-order failed:", (e as Error).message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_id: order.id,
        customer_id: customerId,
        is_new_account: isNewAccount,
        credentials: isNewAccount
          ? { email, password: generatedPassword, portal_url: "/portal/login" }
          : null,
        total: totalPrice,
        qty,
        price,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("multibeauty-checkout error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || "Terjadi kesalahan" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
