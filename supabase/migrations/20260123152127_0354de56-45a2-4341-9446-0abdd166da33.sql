-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Admins can only read own record" ON public.admins;

-- Create a security definer function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins
    WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
      AND role = 'super_admin'
  )
$$;

-- Create new policy: Super Admin sees all, Admin sees own record only
CREATE POLICY "Admins read access" ON public.admins
FOR SELECT USING (
  is_authenticated_admin() AND (
    is_super_admin() OR
    email = current_setting('request.jwt.claims', true)::json->>'email'
  )
);