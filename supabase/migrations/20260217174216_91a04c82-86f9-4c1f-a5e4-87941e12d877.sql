
-- Add explicit INSERT policy for merchants as a safety net
DROP POLICY IF EXISTS "Merchants insert own products" ON public.merchant_products;

CREATE POLICY "Merchants insert own products"
ON public.merchant_products FOR INSERT
TO authenticated
WITH CHECK (merchant_id = get_current_merchant_id());
