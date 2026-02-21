-- Add product_name column to orders for direct storage (especially merchant products)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS product_name text;

-- Recreate view to use stored product_name as fallback
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
  COALESCE(p.name, o.product_name, 'Produk') AS product_name,
  COALESCE(p.type, o.order_type) AS product_type,
  o.item_notes,
  o.delivery_type,
  o.delivery_address,
  o.delivery_notes,
  o.estimated_shipping_cost,
  o.estimated_distance_km,
  o.merchant_id,
  o.order_type
FROM public.orders o
LEFT JOIN public.products p ON o.product_id = p.id;
