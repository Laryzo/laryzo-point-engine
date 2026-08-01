
-- Allow customers to read merchant information so they can see store names in the shop
CREATE POLICY "Customers can read merchants"
ON public.merchants
FOR SELECT
USING (is_authenticated_customer());

-- Grant execute back to authenticated users so RLS policies can use these functions
GRANT EXECUTE ON FUNCTION public.is_authenticated_customer() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_authenticated_merchant() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_authenticated_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_customer_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_merchant_id() TO authenticated;
