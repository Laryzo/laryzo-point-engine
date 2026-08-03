CREATE OR REPLACE FUNCTION public.get_public_merchants(ids uuid[])
RETURNS TABLE(id uuid, name text, business_name text, business_address text, logo_url text, latitude numeric, longitude numeric, is_active boolean, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id, m.name, m.business_name, m.business_address, m.logo_url, m.latitude, m.longitude, m.is_active, m.created_at
  FROM public.merchants m
  WHERE m.id = ANY(ids) AND m.is_active = true
$$;

REVOKE ALL ON FUNCTION public.get_public_merchants(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_merchants(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_merchants(uuid[]) TO service_role;