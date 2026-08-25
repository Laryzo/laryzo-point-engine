-- Point Engine hardening: atomic/idempotent transaction distribution and BFS customer placement

-- Ensure point distribution rows for the same transaction recipient/level cannot be duplicated.
CREATE UNIQUE INDEX IF NOT EXISTS idx_point_history_transaction_recipient_level_unique
ON public.point_history (transaction_id, to_customer, level)
WHERE transaction_id IS NOT NULL;

-- Helpful index for tree traversal / BFS slot lookup.
CREATE INDEX IF NOT EXISTS idx_customers_parent_position_created
ON public.customers (parent_id, position, created_at, id);

CREATE OR REPLACE FUNCTION public.distribute_transaction_points(_transaction_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  tx RECORD;
  total_profit numeric := 0;
  points_per_level numeric := 0;
  existing_count integer := 0;
  inserted_count integer := 0;
BEGIN
  IF _transaction_id IS NULL THEN
    RAISE EXCEPTION 'transaction_id is required';
  END IF;

  -- Serialize retries/concurrent calls for the same transaction.
  PERFORM pg_advisory_xact_lock(hashtextextended('point_distribution:' || _transaction_id::text, 0));

  SELECT id, customer_id, harga_konsumen, harga_pokok, qty, product_code, product_name
  INTO tx
  FROM public.transactions
  WHERE id = _transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'transaction_not_found';
  END IF;

  SELECT count(*) INTO existing_count
  FROM public.point_history
  WHERE transaction_id = _transaction_id;

  IF existing_count > 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_processed', true,
      'transaction_id', _transaction_id,
      'point_records_created', 0,
      'existing_point_records', existing_count
    );
  END IF;

  IF tx.customer_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_processed', false,
      'transaction_id', _transaction_id,
      'point_records_created', 0,
      'reason', 'no_customer'
    );
  END IF;

  -- Business rule: total profit = (customer price - base cost) * quantity.
  total_profit := round((COALESCE(tx.harga_konsumen, 0) - COALESCE(tx.harga_pokok, 0)) * COALESCE(tx.qty, 1));

  IF total_profit <= 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_processed', false,
      'transaction_id', _transaction_id,
      'point_records_created', 0,
      'total_profit', total_profit,
      'reason', 'non_positive_profit'
    );
  END IF;

  points_per_level := total_profit * 0.01;

  WITH RECURSIVE chain AS (
    SELECT
      c.id,
      c.parent_id,
      COALESCE(c.points_blocked, false) AS points_blocked,
      0::integer AS level
    FROM public.customers c
    WHERE c.id = tx.customer_id

    UNION ALL

    SELECT
      parent.id,
      parent.parent_id,
      COALESCE(parent.points_blocked, false) AS points_blocked,
      chain.level + 1 AS level
    FROM chain
    JOIN public.customers parent ON parent.id = chain.parent_id
    WHERE chain.level < 10
  ), eligible AS (
    SELECT
      tx.customer_id AS from_customer,
      chain.id AS to_customer,
      chain.level,
      points_per_level AS points,
      COALESCE(tx.product_code, '') AS product_code,
      CASE
        WHEN chain.level = 0 THEN 'Bonus poin ' || COALESCE(NULLIF(tx.product_name, ''), NULLIF(tx.product_code, ''), 'transaksi')
        ELSE 'Bonus jaringan level ' || chain.level::text
      END AS description
    FROM chain
    WHERE chain.level BETWEEN 0 AND 10
      AND chain.points_blocked = false
  ), inserted AS (
    INSERT INTO public.point_history (
      transaction_id,
      from_customer,
      to_customer,
      level,
      points,
      product_code,
      description
    )
    SELECT
      _transaction_id,
      eligible.from_customer,
      eligible.to_customer,
      eligible.level,
      eligible.points,
      eligible.product_code,
      eligible.description
    FROM eligible
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO inserted_count FROM inserted;

  RETURN jsonb_build_object(
    'success', true,
    'already_processed', false,
    'transaction_id', _transaction_id,
    'total_profit', total_profit,
    'points_per_level', points_per_level,
    'point_records_created', inserted_count,
    'max_levels', 10,
    'max_distributions', 11
  );
END;
$$;

REVOKE ALL ON FUNCTION public.distribute_transaction_points(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.distribute_transaction_points(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.recalculate_all_transaction_points()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  tx_row RECORD;
  result jsonb;
  processed_count integer := 0;
  total_created integer := 0;
BEGIN
  -- Serialize full recalculation separately from per-transaction processing.
  PERFORM pg_advisory_xact_lock(hashtextextended('point_recalculate_all_transactions_v1', 0));

  -- Only remove point rows tied to transactions. Manual adjustments/refunds with NULL transaction_id remain intact.
  DELETE FROM public.point_history
  WHERE transaction_id IS NOT NULL;

  FOR tx_row IN
    SELECT id FROM public.transactions ORDER BY created_at ASC, id ASC
  LOOP
    result := public.distribute_transaction_points(tx_row.id);
    processed_count := processed_count + 1;
    total_created := total_created + COALESCE((result->>'point_records_created')::integer, 0);
  END LOOP;

  -- Reconcile balances from remaining point history after the recalculation.
  UPDATE public.customers c
  SET points = COALESCE((
        SELECT SUM(ph.points)
        FROM public.point_history ph
        WHERE ph.to_customer = c.id
      ), 0),
      updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'transactions_processed', processed_count,
    'point_records_created', total_created,
    'customers_reconciled', true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.recalculate_all_transaction_points() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_all_transaction_points() TO service_role;

CREATE OR REPLACE FUNCTION public.create_customer_with_bfs_slot(
  _name text,
  _email text DEFAULT NULL,
  _whatsapp text DEFAULT NULL
)
RETURNS public.customers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  jwt_claims jsonb;
  jwt_role text;
  can_create boolean := false;
  slot_parent uuid := NULL;
  slot_position public.customer_position := NULL;
  new_customer public.customers;
BEGIN
  IF _name IS NULL OR length(btrim(_name)) = 0 THEN
    RAISE EXCEPTION 'name is required';
  END IF;

  BEGIN
    jwt_claims := current_setting('request.jwt.claims', true)::jsonb;
    jwt_role := COALESCE(jwt_claims->>'role', '');
  EXCEPTION WHEN OTHERS THEN
    jwt_claims := '{}'::jsonb;
    jwt_role := '';
  END;

  can_create := jwt_role = 'service_role'
    OR public.is_authenticated_admin()
    OR public.is_authenticated_merchant();

  IF NOT can_create THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  -- Serialize slot selection + insert to make concurrent customer creation safe.
  PERFORM pg_advisory_xact_lock(hashtextextended('customer_bfs_slot_v1', 0));

  IF EXISTS (SELECT 1 FROM public.customers) THEN
    WITH RECURSIVE tree AS (
      SELECT
        roots.id,
        roots.parent_id,
        roots.position,
        roots.created_at,
        0::integer AS depth,
        ARRAY[roots.root_order::integer] AS path
      FROM (
        SELECT
          c.id,
          c.parent_id,
          c.position,
          c.created_at,
          row_number() OVER (ORDER BY c.created_at ASC, c.id ASC) AS root_order
        FROM public.customers c
        WHERE c.parent_id IS NULL
      ) roots

      UNION ALL

      SELECT
        child.id,
        child.parent_id,
        child.position,
        child.created_at,
        tree.depth + 1 AS depth,
        tree.path || CASE child.position WHEN 'left' THEN 1 ELSE 2 END
      FROM tree
      JOIN public.customers child ON child.parent_id = tree.id
      WHERE child.position IS NOT NULL
    ), candidate AS (
      SELECT
        tree.id AS parent_id,
        CASE
          WHEN NOT EXISTS (
            SELECT 1 FROM public.customers left_child
            WHERE left_child.parent_id = tree.id AND left_child.position = 'left'
          ) THEN 'left'::public.customer_position
          WHEN NOT EXISTS (
            SELECT 1 FROM public.customers right_child
            WHERE right_child.parent_id = tree.id AND right_child.position = 'right'
          ) THEN 'right'::public.customer_position
          ELSE NULL::public.customer_position
        END AS position,
        tree.depth,
        tree.path
      FROM tree
    )
    SELECT candidate.parent_id, candidate.position
    INTO slot_parent, slot_position
    FROM candidate
    WHERE candidate.position IS NOT NULL
    ORDER BY candidate.depth ASC, candidate.path ASC
    LIMIT 1;
  END IF;

  INSERT INTO public.customers (name, email, whatsapp, parent_id, position)
  VALUES (btrim(_name), NULLIF(btrim(COALESCE(_email, '')), ''), NULLIF(btrim(COALESCE(_whatsapp, '')), ''), slot_parent, slot_position)
  RETURNING * INTO new_customer;

  RETURN new_customer;
END;
$$;

REVOKE ALL ON FUNCTION public.create_customer_with_bfs_slot(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_customer_with_bfs_slot(text, text, text) TO authenticated, service_role;