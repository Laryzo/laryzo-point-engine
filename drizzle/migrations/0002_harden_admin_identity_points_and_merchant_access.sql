-- 1. Bind admin rows to their Supabase auth user (identity pinning)
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS user_id uuid;
COMMENT ON COLUMN public.admins.user_id IS 'Supabase auth user bound to this admin row; admin sessions must match this id';

UPDATE public.admins a
SET user_id = u.id
FROM auth.users u
WHERE a.user_id IS NULL
  AND lower(u.email) = lower(a.email)
  AND (SELECT count(*) FROM auth.users u2 WHERE lower(u2.email) = lower(a.email)) = 1;

-- 2. Order-scoped point spending: idempotency marker
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS points_debited_at timestamptz;
COMMENT ON COLUMN public.orders.points_debited_at IS 'Set when the customer points for this order have been debited; guards duplicate debits';

-- 3. Password reset tokens table (single-use, attempt-capped)
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  email text NOT NULL,
  token text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.password_reset_tokens TO service_role;
REVOKE ALL ON public.password_reset_tokens FROM anon, authenticated;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS password_reset_tokens_email_idx ON public.password_reset_tokens (email);

-- 4. Order-bound point spend/refund RPCs (replace the raw points RPC for customers)
CREATE OR REPLACE FUNCTION public.spend_points_for_order(_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  o RECORD;
  caller uuid;
  rows_updated integer;
BEGIN
  caller := public.get_current_customer_id();
  IF caller IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT * INTO o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;
  IF o.customer_id IS DISTINCT FROM caller THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF o.order_type = 'ppob' THEN
    RAISE EXCEPTION 'invalid_order_type';
  END IF;

  IF o.points_debited_at IS NOT NULL THEN
    RETURN true; -- already debited, idempotent retry
  END IF;

  IF COALESCE(o.points_used, 0) <= 0 THEN
    UPDATE public.orders SET points_debited_at = now() WHERE id = _order_id;
    RETURN true;
  END IF;

  UPDATE public.customers
  SET points = COALESCE(points, 0) - o.points_used,
      updated_at = now()
  WHERE id = caller
    AND (points_blocked IS NULL OR points_blocked = false)
    AND COALESCE(points, 0) >= o.points_used;

  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  IF rows_updated = 0 THEN
    RETURN false;
  END IF;

  UPDATE public.orders SET points_debited_at = now() WHERE id = _order_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_points_for_order(_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  o RECORD;
  caller uuid;
BEGIN
  caller := public.get_current_customer_id();
  IF caller IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT * INTO o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN true; -- order gone, nothing to refund
  END IF;
  IF o.customer_id IS DISTINCT FROM caller THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF o.points_debited_at IS NULL OR COALESCE(o.points_used, 0) <= 0 THEN
    RETURN true; -- nothing was debited
  END IF;

  UPDATE public.customers
  SET points = COALESCE(points, 0) + o.points_used,
      updated_at = now()
  WHERE id = caller;

  UPDATE public.orders SET points_debited_at = NULL WHERE id = _order_id;
  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.spend_points_for_order(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.refund_points_for_order(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.spend_points_for_order(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refund_points_for_order(uuid) TO authenticated;

-- 5. Lock the raw points RPC down to service role only
REVOKE EXECUTE ON FUNCTION public.increment_customer_points(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_customer_points(uuid, numeric) TO service_role;

-- 6. Block self-service modification of sensitive customer columns
CREATE OR REPLACE FUNCTION public.guard_customer_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.is_authenticated_customer() AND NOT COALESCE(public.is_authenticated_admin(), false) THEN
    IF NEW.points IS DISTINCT FROM OLD.points
       OR NEW.points_blocked IS DISTINCT FROM OLD.points_blocked
       OR NEW.parent_id IS DISTINCT FROM OLD.parent_id
       OR NEW.position IS DISTINCT FROM OLD.position THEN
      RAISE EXCEPTION 'Kolom poin/struktur jaringan hanya dapat diubah oleh admin';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_customer_self_update_trg ON public.customers;
CREATE TRIGGER guard_customer_self_update_trg
BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.guard_customer_self_update();

-- 7. Disabled merchants lose data access immediately
CREATE OR REPLACE FUNCTION public.is_authenticated_merchant()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  claims json;
  user_email text;
BEGIN
  BEGIN
    claims := current_setting('request.jwt.claims', true)::json;
    user_email := claims->>'email';
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;
  IF user_email IS NULL OR COALESCE(claims->>'role', '') != 'authenticated' THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM public.merchant_auth ma
    JOIN public.merchants m ON m.id = ma.merchant_id
    WHERE ma.email = user_email
      AND m.is_active = true
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_current_merchant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  claims json;
  user_email text;
  merchant_uuid uuid;
BEGIN
  BEGIN
    claims := current_setting('request.jwt.claims', true)::json;
    user_email := claims->>'email';
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
  IF user_email IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT m.id INTO merchant_uuid
  FROM public.merchants m
  INNER JOIN public.merchant_auth ma ON ma.merchant_id = m.id
  WHERE ma.email = user_email
    AND m.is_active = true
  LIMIT 1;
  RETURN merchant_uuid;
END;
$function$;