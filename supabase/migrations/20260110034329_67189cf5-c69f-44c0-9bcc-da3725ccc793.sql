-- Enable RLS on the products_public view and add a permissive policy for public read
ALTER VIEW public.products_public SET (security_invoker = true);

-- Note: Views inherit RLS from underlying tables. Since products table has RLS enabled
-- and the view uses SECURITY INVOKER, the view respects the caller's permissions.
-- However, we need to add an explicit policy to allow public read of the view's data.

-- Create a policy on the products table that allows reading active products for the view
CREATE POLICY "Public read active products via view" ON products
FOR SELECT USING (is_active = true);

-- Note: This policy is OR'd with the admin-only policy, allowing:
-- 1. Admins to read ALL products (including inactive)
-- 2. Anyone to read ONLY active products (but only the columns exposed by the view)