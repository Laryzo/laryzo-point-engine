-- Fix Security Definer View warning: make the view use SECURITY INVOKER
DROP VIEW IF EXISTS public.products_public;

CREATE VIEW public.products_public
WITH (security_invoker = true)
AS
SELECT
  id,
  name,
  description,
  image_url,
  type,
  ppob_type,
  point_price,
  stock,
  requires_input,
  requires_shipping,
  is_active
FROM products
WHERE is_active = true;

-- Grant access to the view for anonymous and authenticated users
GRANT SELECT ON public.products_public TO anon, authenticated;