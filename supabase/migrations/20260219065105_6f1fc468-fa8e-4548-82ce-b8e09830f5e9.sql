
-- Add customer_name to merchant_transactions for display in history
ALTER TABLE public.merchant_transactions ADD COLUMN IF NOT EXISTS customer_name text;

-- Add point_price to merchant_products for customer shop purchases
ALTER TABLE public.merchant_products ADD COLUMN IF NOT EXISTS point_price numeric DEFAULT 0;
