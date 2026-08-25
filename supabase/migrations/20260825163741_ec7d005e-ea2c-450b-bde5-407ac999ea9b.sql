REVOKE EXECUTE ON FUNCTION public.distribute_transaction_points(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalculate_all_transaction_points() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_customer_with_bfs_slot(text, text, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.distribute_transaction_points(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.recalculate_all_transaction_points() TO service_role;
GRANT EXECUTE ON FUNCTION public.create_customer_with_bfs_slot(text, text, text) TO service_role;