-- ============================================================================
-- 1) Move plaintext passwords to an admin-only table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.customer_credentials (
  customer_id uuid PRIMARY KEY REFERENCES public.customers(id) ON DELETE CASCADE,
  plain_password text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_credentials TO authenticated;
GRANT ALL ON public.customer_credentials TO service_role;

ALTER TABLE public.customer_credentials ENABLE ROW LEVEL SECURITY;

-- Only admins may read/write these plaintext credentials via the Data API.
DROP POLICY IF EXISTS "Admins read customer_credentials" ON public.customer_credentials;
CREATE POLICY "Admins read customer_credentials"
  ON public.customer_credentials FOR SELECT TO authenticated
  USING (public.is_authenticated_admin());

DROP POLICY IF EXISTS "Admins write customer_credentials" ON public.customer_credentials;
CREATE POLICY "Admins write customer_credentials"
  ON public.customer_credentials FOR ALL TO authenticated
  USING (public.is_authenticated_admin())
  WITH CHECK (public.is_authenticated_admin());

-- Backfill from the existing column (only if it still exists).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'plain_password'
  ) THEN
    INSERT INTO public.customer_credentials (customer_id, plain_password)
    SELECT id, plain_password FROM public.customers WHERE plain_password IS NOT NULL
    ON CONFLICT (customer_id) DO UPDATE SET plain_password = EXCLUDED.plain_password;

    ALTER TABLE public.customers DROP COLUMN plain_password;
  END IF;
END$$;

-- ============================================================================
-- 2) Restrict merchant access to customers table
-- ============================================================================
DROP POLICY IF EXISTS "Merchants can search customers" ON public.customers;

-- Safe merchant lookups via SECURITY DEFINER RPCs that only return non-sensitive columns.
CREATE OR REPLACE FUNCTION public.merchant_search_customer(query text)
RETURNS TABLE (id uuid, name text, email text, whatsapp text, points numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_authenticated_merchant() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF query IS NULL OR length(btrim(query)) = 0 THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT c.id, c.name, c.email, c.whatsapp, c.points
  FROM public.customers c
  WHERE c.name ILIKE '%' || query || '%'
     OR c.email ILIKE '%' || query || '%'
     OR c.whatsapp ILIKE '%' || query || '%'
  LIMIT 5;
END;
$$;

REVOKE ALL ON FUNCTION public.merchant_search_customer(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merchant_search_customer(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.merchant_get_customer_names(ids uuid[])
RETURNS TABLE (id uuid, name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_authenticated_merchant() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
  SELECT c.id, c.name FROM public.customers c WHERE c.id = ANY(ids);
END;
$$;

REVOKE ALL ON FUNCTION public.merchant_get_customer_names(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merchant_get_customer_names(uuid[]) TO authenticated;

-- ============================================================================
-- 3) Stop broadcasting sensitive tables via Realtime
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.customers; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.orders; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.point_history; EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
END$$;

-- ============================================================================
-- 4) Tighten merchant-logos storage policies
-- ============================================================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (policyname ILIKE '%merchant-logos%' OR policyname ILIKE '%merchant_logos%')
  LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', r.policyname);
  END LOOP;
END$$;

CREATE POLICY "merchant-logos read public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'merchant-logos');

CREATE POLICY "merchant-logos merchant insert own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'merchant-logos'
    AND public.is_authenticated_merchant()
    AND (storage.foldername(name))[1] = public.get_current_merchant_id()::text
  );

CREATE POLICY "merchant-logos merchant update own folder"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'merchant-logos'
    AND public.is_authenticated_merchant()
    AND (storage.foldername(name))[1] = public.get_current_merchant_id()::text
  );

CREATE POLICY "merchant-logos merchant delete own folder"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'merchant-logos'
    AND public.is_authenticated_merchant()
    AND (storage.foldername(name))[1] = public.get_current_merchant_id()::text
  );

-- ============================================================================
-- 5) Fix public bucket listing (revoke overly-broad storage SELECT policies)
-- ============================================================================
-- Drop any policy that grants SELECT on ALL bucket_ids (typical "Public read all buckets" pattern).
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname, qual
    FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND cmd = 'SELECT'
  LOOP
    -- Only drop policies whose USING clause has no bucket_id filter (i.e., match-all).
    IF r.qual IS NULL OR r.qual = 'true' THEN
      EXECUTE format('DROP POLICY %I ON storage.objects', r.policyname);
    END IF;
  END LOOP;
END$$;

-- ============================================================================
-- 6) Hide sensitive tables from the anon (GraphQL/Data API) schema
-- ============================================================================
REVOKE SELECT ON public.customers FROM anon;
REVOKE SELECT ON public.customer_auth FROM anon;
REVOKE SELECT ON public.customer_credentials FROM anon;
REVOKE SELECT ON public.merchant_auth FROM anon;
REVOKE SELECT ON public.orders FROM anon;
REVOKE SELECT ON public.point_history FROM anon;
REVOKE SELECT ON public.wallet_balances FROM anon;
REVOKE SELECT ON public.wallet_transactions FROM anon;
REVOKE SELECT ON public.topup_requests FROM anon;
REVOKE SELECT ON public.merchant_transactions FROM anon;
REVOKE SELECT ON public.admins FROM anon;
REVOKE SELECT ON public.login_attempts FROM anon;
REVOKE SELECT ON public.digiflazz_price_cache FROM anon;
REVOKE SELECT ON public.satellite_api_keys FROM anon;
REVOKE SELECT ON public.webhook_attempts FROM anon;

-- ============================================================================
-- 7) Block anon from executing SECURITY DEFINER functions
-- ============================================================================
-- Revoke default EXECUTE for anon on all current public functions.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, oidvectortypes(p.proargtypes) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM anon',
                     r.nspname, r.proname, r.args);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END$$;

-- Ensure future public functions do NOT default to EXECUTE for anon.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;