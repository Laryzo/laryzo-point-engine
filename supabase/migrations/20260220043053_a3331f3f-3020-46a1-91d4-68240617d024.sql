
-- Add estimated distance and shipping cost to orders
ALTER TABLE public.orders ADD COLUMN estimated_distance_km numeric DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN estimated_shipping_cost numeric DEFAULT NULL;
