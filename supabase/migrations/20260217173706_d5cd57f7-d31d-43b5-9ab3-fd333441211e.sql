
-- Drop and recreate merchant policies with proper WITH CHECK for INSERT
DROP POLICY IF EXISTS "Merchants manage own products" ON public.merchant_products;
DROP POLICY IF EXISTS "Admins manage merchant products" ON public.merchant_products;

CREATE POLICY "Admins manage merchant products"
ON public.merchant_products FOR ALL
USING (is_authenticated_admin())
WITH CHECK (is_authenticated_admin());

CREATE POLICY "Merchants manage own products"
ON public.merchant_products FOR ALL
USING (is_authenticated_merchant() AND merchant_id = get_current_merchant_id())
WITH CHECK (is_authenticated_merchant() AND merchant_id = get_current_merchant_id());
