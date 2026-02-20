-- Add item_notes column for product-specific notes (e.g., "sambal pedas")
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS item_notes text;

-- Drop and recreate orders_customer_view with item_notes and merchant product support
DROP VIEW IF EXISTS public.orders_customer_view;

CREATE VIEW public.orders_customer_view WITH (security_invoker = true) AS
SELECT
  o.id,
  o.customer_id,
  o.product_id,
  o.points_used,
  o.points_earned,
  o.input_value,
  o.status,
  o.shipping_address,
  o.shipping_status,
  o.tracking_number,
  o.ref_id,
  o.digiflazz_status,
  o.digiflazz_sn,
  o.digiflazz_message,
  o.created_at,
  o.updated_at,
  o.processed_at,
  COALESCE(p.name, mp.name, 'Produk') AS product_name,
  COALESCE(p.type, 'merchant') AS product_type,
  o.item_notes,
  o.delivery_type,
  o.delivery_address,
  o.delivery_notes,
  o.estimated_shipping_cost,
  o.estimated_distance_km,
  o.merchant_id,
  o.order_type
FROM public.orders o
LEFT JOIN public.products p ON o.product_id = p.id
LEFT JOIN public.merchant_products mp ON o.order_type = 'food' AND o.product_id IS NULL AND o.merchant_id = mp.merchant_id;
