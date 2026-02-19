-- Allow merchants to read their own orders
CREATE POLICY "Merchants read own orders"
ON public.orders
FOR SELECT
USING (is_authenticated_merchant() AND merchant_id = get_current_merchant_id());

-- Allow merchants to update their own orders (for delivery status)
CREATE POLICY "Merchants update own orders"
ON public.orders
FOR UPDATE
USING (is_authenticated_merchant() AND merchant_id = get_current_merchant_id());
