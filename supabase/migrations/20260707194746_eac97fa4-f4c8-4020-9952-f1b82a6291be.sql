
-- 1) Drop weak merchant-logos policies (auth-only, no folder ownership check)
DROP POLICY IF EXISTS "Authenticated merchants can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated merchants can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated merchants can delete logos" ON storage.objects;

-- 2) Drop broad SELECT (listing) policies on public buckets.
--    Public buckets still serve files via public URL without needing a
--    storage.objects SELECT policy; removing these prevents enumerating
--    every file in the bucket via the storage.objects table.
DROP POLICY IF EXISTS "Anyone can view merchant logos" ON storage.objects;
DROP POLICY IF EXISTS "merchant-logos read public" ON storage.objects;
DROP POLICY IF EXISTS "Public read merchant product images" ON storage.objects;

-- 3) Revoke EXECUTE from anon/authenticated on SECURITY DEFINER functions
--    that must never be invoked directly via the Data API.
REVOKE EXECUTE ON FUNCTION public.increment_customer_points(uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_topup_approval() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_customer_points_on_history_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- 4) Hide GraphQL schema from anon/authenticated to stop schema introspection.
REVOKE USAGE ON SCHEMA graphql FROM anon, authenticated;
REVOKE USAGE ON SCHEMA graphql_public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA graphql_public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA graphql FROM anon, authenticated;
