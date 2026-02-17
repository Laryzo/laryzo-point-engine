
-- Drop all existing restrictive policies on merchant_products
DROP POLICY IF EXISTS "Admins manage merchant products" ON public.merchant_products;
DROP POLICY IF EXISTS "Customers read active merchant products" ON public.merchant_products;
DROP POLICY IF EXISTS "Merchants manage own products" ON public.merchant_products;
DROP POLICY IF EXISTS "No anon access merchant products" ON public.merchant_products;

-- Recreate as PERMISSIVE policies (default)
CREATE POLICY "Admins manage merchant products"
ON public.merchant_products FOR ALL
USING (is_authenticated_admin());

CREATE POLICY "Merchants manage own products"
ON public.merchant_products FOR ALL
USING (is_authenticated_merchant() AND merchant_id = get_current_merchant_id());

CREATE POLICY "Customers read active merchant products"
ON public.merchant_products FOR SELECT
USING (is_authenticated_customer() AND is_active = true);
