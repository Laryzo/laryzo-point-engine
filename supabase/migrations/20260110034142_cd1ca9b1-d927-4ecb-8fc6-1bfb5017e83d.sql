-- Fix: Products Table Exposes Cost Prices and Supplier Integration Details
-- Create a public view with limited columns for customer access

-- Drop the existing policy that allows public read of all columns
DROP POLICY IF EXISTS "Public read active products" ON products;

-- Create a view with only customer-facing columns (no cost_price or digiflazz_sku)
CREATE OR REPLACE VIEW public.products_public AS
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

-- Create new admin-only policy for the products table
CREATE POLICY "Admins read all products" ON products
FOR SELECT USING (is_authenticated_admin());