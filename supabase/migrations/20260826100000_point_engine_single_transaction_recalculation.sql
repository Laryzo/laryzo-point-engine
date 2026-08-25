-- Recalculate only one transaction in one database transaction.
-- The advisory lock and row lock make retries/concurrent recalculation safe.
CREATE OR REPLACE FUNCTION public.replace_transaction_points(_transaction_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count integer := 0;
  result jsonb;
BEGIN
  IF _transaction_id IS NULL THEN
    RAISE EXCEPTION 'transaction_id is required';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('point_distribution:' || _transaction_id::text, 0));

  IF NOT EXISTS (
    SELECT 1 FROM public.transactions WHERE id = _transaction_id FOR UPDATE
  ) THEN
    RAISE EXCEPTION 'transaction_not_found';
  END IF;

  DELETE FROM public.point_history
  WHERE transaction_id = _transaction_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  SELECT public.distribute_transaction_points(_transaction_id) INTO result;

  RETURN result || jsonb_build_object('replaced_point_records', deleted_count);
END;
$$;

REVOKE ALL ON FUNCTION public.replace_transaction_points(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_transaction_points(uuid) TO service_role;
