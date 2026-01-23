-- Enable realtime for point_history and customers tables
-- Orders is already enabled

ALTER PUBLICATION supabase_realtime ADD TABLE public.point_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;