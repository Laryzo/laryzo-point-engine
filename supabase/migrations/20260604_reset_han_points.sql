-- Reset points for customer Han to 0
UPDATE public.customers 
SET points = 0, updated_at = NOW()
WHERE name = 'Han';
