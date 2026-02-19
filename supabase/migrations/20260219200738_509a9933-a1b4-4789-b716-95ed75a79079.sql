-- Allow merchants to delete their own orders (for super_admin merchants)
CREATE POLICY "Merchants delete own orders"
ON public.orders
FOR DELETE
USING (is_authenticated_merchant() AND merchant_id = get_current_merchant_id());