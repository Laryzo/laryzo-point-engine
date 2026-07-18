-- Add category column to merchant_products
ALTER TABLE public.merchant_products ADD COLUMN IF NOT EXISTS category text;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_merchant_products_category ON public.merchant_products(category);
