-- Fix the search path issue
CREATE OR REPLACE FUNCTION public.check_admins_exist()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins LIMIT 1
  );
$$;