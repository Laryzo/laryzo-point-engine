-- Create get_current_customer_id() helper function for RLS policies
CREATE OR REPLACE FUNCTION public.get_current_customer_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  claims json;
  user_email text;
  customer_uuid uuid;
BEGIN
  -- Get JWT claims
  BEGIN
    claims := current_setting('request.jwt.claims', true)::json;
    user_email := claims->>'email';
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
  
  -- Return NULL if no email in claims
  IF user_email IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Look up customer ID from email
  SELECT c.id INTO customer_uuid
  FROM public.customers c
  INNER JOIN public.customer_auth ca ON ca.customer_id = c.id
  WHERE ca.email = user_email
  LIMIT 1;
  
  RETURN customer_uuid;
END;
$$;

-- Update customers RLS policies to restrict customer access to their own data
DROP POLICY IF EXISTS "Admins read customers" ON public.customers;
CREATE POLICY "Read own or admin access customers" ON public.customers
FOR SELECT USING (
  is_authenticated_admin() OR 
  (is_authenticated_customer() AND id = get_current_customer_id())
);

-- Update orders RLS policies to restrict customer access to their own orders
DROP POLICY IF EXISTS "Admins and customers read orders" ON public.orders;
CREATE POLICY "Read own or admin access orders" ON public.orders
FOR SELECT USING (
  is_authenticated_admin() OR 
  (is_authenticated_customer() AND customer_id = get_current_customer_id())
);

-- Update point_history RLS policies to restrict customer access to their own transactions
DROP POLICY IF EXISTS "Admins read point_history" ON public.point_history;
CREATE POLICY "Read own or admin access point_history" ON public.point_history
FOR SELECT USING (
  is_authenticated_admin() OR 
  (is_authenticated_customer() AND (
    from_customer = get_current_customer_id() OR 
    to_customer = get_current_customer_id()
  ))
);