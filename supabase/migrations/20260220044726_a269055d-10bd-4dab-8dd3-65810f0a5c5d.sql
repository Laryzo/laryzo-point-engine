-- Add GPS coordinates to merchants (pickup point)
ALTER TABLE public.merchants ADD COLUMN latitude numeric DEFAULT NULL;
ALTER TABLE public.merchants ADD COLUMN longitude numeric DEFAULT NULL;

-- Add GPS coordinates to orders (delivery destination)
ALTER TABLE public.orders ADD COLUMN delivery_latitude numeric DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN delivery_longitude numeric DEFAULT NULL;