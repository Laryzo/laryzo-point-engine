-- Tambah kolom konfirmasi customer untuk order PPOB manual fallback
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_confirmed_at timestamptz;

-- Aktifkan realtime untuk orders (jika belum aktif)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END $$;

-- Update view orders_customer_view untuk expose kolom baru
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
  COALESCE(o.product_name, p.name) AS product_name,
  p.type AS product_type
FROM public.orders o
LEFT JOIN public.products p ON p.id = o.product_id;

GRANT SELECT ON public.orders_customer_view TO authenticated, anon;