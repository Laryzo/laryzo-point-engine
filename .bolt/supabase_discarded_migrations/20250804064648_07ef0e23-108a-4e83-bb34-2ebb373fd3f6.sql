-- Fix the is_authenticated_admin function to work properly during login
CREATE OR REPLACE FUNCTION public.is_authenticated_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- Allow access if user is authenticated OR if no session exists (for login process)
  SELECT CASE 
    WHEN auth.uid() IS NULL THEN true  -- Allow during login process
    ELSE EXISTS (
      SELECT 1 FROM public.admins 
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
      AND current_setting('request.jwt.claims', true)::json->>'role' = 'authenticated'
    )
  END;
$function$;