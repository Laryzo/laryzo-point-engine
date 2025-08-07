-- Fix all remaining function search path warnings
CREATE OR REPLACE FUNCTION public.delete_point_history_on_transaction_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM point_history WHERE transaction_id = OLD.id;
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_authenticated_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  -- Allow access if user is authenticated OR if no session exists (for login process)
  SELECT CASE 
    WHEN auth.uid() IS NULL THEN true  -- Allow during login process
    ELSE EXISTS (
      SELECT 1 FROM public.admins 
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
      AND current_setting('request.jwt.claims', true)::json->>'role' = 'authenticated'
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.check_admins_exist()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM admins LIMIT 1);
END;
$$;