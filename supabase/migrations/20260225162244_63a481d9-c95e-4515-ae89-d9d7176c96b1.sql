-- Allow customers to update their own record (profile, location, address)
CREATE POLICY "Customers update own profile"
ON public.customers
FOR UPDATE
USING (is_authenticated_customer() AND id = get_current_customer_id())
WITH CHECK (is_authenticated_customer() AND id = get_current_customer_id());