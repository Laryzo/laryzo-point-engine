-- Update orders_customer_view to include product image URL
DROP VIEW IF EXISTS public.orders_customer_view;

CREATE VIEW public.orders_customer_view
WITH (security_invoker=on) AS
SELECT
  o.id,
  o.customer_id,
  o.product_id,
  o.merchant_id,
  o.order_type,
  o.status,
  o.points_used,
  o.points_earned,
  o.input_value,
  o.shipping_address,
  o.shipping_status,
  o.tracking_number,
  o.delivery_type,
  o.delivery_address,
  o.delivery_notes,
  o.delivery_latitude,
  o.delivery_longitude,
  o.estimated_distance_km,
  o.estimated_shipping_cost,
  o.pickup_address,
  o.delivery_status,
  o.digiflazz_status,
  o.digiflazz_message,
  o.digiflazz_sn,
  o.ref_id,
  o.item_notes,
  o.processed_at,
  o.created_at,
  o.updated_at,
  o.customer_confirmed_at,
  COALESCE(o.product_name, p.name, mp.name) AS product_name,
  COALESCE(p.type, 'merchant') AS product_type,
  COALESCE(p.image_url, mp.image_url) AS product_image_url
FROM public.orders o
LEFT JOIN public.products p ON p.id = o.product_id
LEFT JOIN public.merchant_products mp ON o.merchant_id = mp.merchant_id AND o.order_type = 'merchant';

GRANT SELECT ON public.orders_customer_view TO authenticated, anon;
