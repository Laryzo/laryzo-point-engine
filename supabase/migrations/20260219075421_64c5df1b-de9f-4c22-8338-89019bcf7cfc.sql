
-- Drop restrictive policies
DROP POLICY IF EXISTS "Admins manage merchant products" ON public.merchant_products;
DROP POLICY IF EXISTS "Customers read active merchant products" ON public.merchant_products;
DROP POLICY IF EXISTS "Merchants manage own products" ON public.merchant_products;

-- Recreate as PERMISSIVE
CREATE POLICY "Admins manage merchant products"
  ON public.merchant_products FOR ALL
  USING (is_authenticated_admin())
  WITH CHECK (is_authenticated_admin());

CREATE POLICY "Customers read active merchant products"
  ON public.merchant_products FOR SELECT
  USING (is_authenticated_customer() AND is_active = true);

CREATE POLICY "Merchants manage own products"
  ON public.merchant_products FOR ALL
  USING (is_authenticated_merchant() AND merchant_id = get_current_merchant_id())
  WITH CHECK (is_authenticated_merchant() AND merchant_id = get_current_merchant_id());
