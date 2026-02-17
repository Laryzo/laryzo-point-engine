
CREATE POLICY "Merchants update own"
ON public.merchants FOR UPDATE
TO authenticated
USING (is_authenticated_merchant() AND id = get_current_merchant_id())
WITH CHECK (is_authenticated_merchant() AND id = get_current_merchant_id());
