-- Fix: Restrict admin password hash visibility to own record only
DROP POLICY IF EXISTS "Authenticated admins can read admins" ON public.admins;
CREATE POLICY "Admins can only read own record" ON public.admins
FOR SELECT USING (
  is_authenticated_admin() AND 
  email = (current_setting('request.jwt.claims', true)::json->>'email')
);

-- Fix: Add explicit DELETE policy for system_settings (block all deletes)
CREATE POLICY "No delete on system settings" ON public.system_settings
FOR DELETE USING (false);