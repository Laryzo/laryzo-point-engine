-- Drop and recreate view to include product join capability
DROP VIEW IF EXISTS public.orders_customer_view;

CREATE VIEW public.orders_customer_view 
WITH (security_invoker = true) AS
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
  -- Include product info directly to avoid join issues
  p.name as product_name,
  p.type as product_type
FROM public.orders o
LEFT JOIN public.products p ON o.product_id = p.id;

GRANT SELECT ON public.orders_customer_view TO authenticated;

COMMENT ON VIEW public.orders_customer_view IS 'Secure customer-facing view of orders with product info, excludes admin_notes';