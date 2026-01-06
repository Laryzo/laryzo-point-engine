-- Add points_blocked column to customers table
ALTER TABLE public.customers 
ADD COLUMN points_blocked BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.customers.points_blocked IS 'Jika true, customer tidak akan menerima poin dari distribusi otomatis';