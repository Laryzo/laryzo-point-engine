-- Create a function to check if any admins exist (bypasses RLS)
CREATE OR REPLACE FUNCTION public.check_admins_exist()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins LIMIT 1
  );
$$;