
-- Add GPS coordinates to customers table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS latitude numeric NULL;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS longitude numeric NULL;
