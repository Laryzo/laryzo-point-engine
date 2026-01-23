-- Create a secure view for customers to read orders without admin_notes
CREATE OR REPLACE VIEW public.orders_customer_view AS
SELECT 
  id,
  customer_id,
  product_id,
  points_used,
  points_earned,
  input_value,
  status,
  shipping_address,
  shipping_status,
  tracking_number,
  ref_id,
  digiflazz_status,
  digiflazz_sn,
  digiflazz_message,
  created_at,
  updated_at,
  processed_at
FROM public.orders;

-- Grant select on the view to authenticated users
GRANT SELECT ON public.orders_customer_view TO authenticated;

-- Add comment explaining the view purpose
COMMENT ON VIEW public.orders_customer_view IS 'Secure customer-facing view of orders that excludes admin_notes field';