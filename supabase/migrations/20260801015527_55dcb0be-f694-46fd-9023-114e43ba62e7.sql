-- 1. Remove permissive "true" policies on customers
DROP POLICY IF EXISTS "select_customers" ON public.customers;
DROP POLICY IF EXISTS "insert_customers" ON public.customers;
DROP POLICY IF EXISTS "update_customers" ON public.customers;
DROP POLICY IF EXISTS "delete_customers" ON public.customers;

-- 2. landing_pages: drafts/settings must not be world-readable
DROP POLICY IF EXISTS "Public can read landing pages" ON public.landing_pages;

CREATE POLICY "Admins can read landing pages"
ON public.landing_pages
FOR SELECT
TO authenticated
USING (public.is_authenticated_admin());

REVOKE SELECT ON public.landing_pages FROM anon;

-- Published-only accessor for public visitors
CREATE OR REPLACE FUNCTION public.get_landing_page_published(page_slug text)
RETURNS TABLE (
  slug text,
  title text,
  theme_published jsonb,
  sections_published jsonb,
  settings_published jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lp.slug, lp.title, lp.theme_published, lp.sections_published, lp.settings_published
  FROM public.landing_pages lp
  WHERE lp.slug = page_slug
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_landing_page_published(text) TO anon, authenticated;

-- 3. Lock down direct execution of internal SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.is_authenticated_admin() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_authenticated_customer() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_authenticated_merchant() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_merchant_super_admin() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_current_customer_id() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_current_merchant_id() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_topup_approval() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_customer_points_on_history_change() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_customer_points(uuid, numeric) FROM anon;

-- Keep only the intentionally client-facing RPCs
GRANT EXECUTE ON FUNCTION public.merchant_search_customer(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.merchant_get_customer_names(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_customer_points(uuid, numeric) TO authenticated;

-- 4. GraphQL endpoint stays closed to public roles
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'graphql_public') THEN
    EXECUTE 'REVOKE USAGE ON SCHEMA graphql_public FROM anon, authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'graphql') THEN
    EXECUTE 'REVOKE USAGE ON SCHEMA graphql FROM anon, authenticated';
  END IF;
END $$;