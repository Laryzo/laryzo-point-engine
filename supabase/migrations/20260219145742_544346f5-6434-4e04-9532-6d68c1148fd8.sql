
CREATE POLICY "Merchants can search customers"
ON public.customers
FOR SELECT
USING (is_authenticated_merchant());
