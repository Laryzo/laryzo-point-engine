
-- Add service/dynamic-pricing support to merchant items
ALTER TABLE public.merchant_products
  ADD COLUMN IF NOT EXISTS item_type text NOT NULL DEFAULT 'product',
  ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'pcs',
  ADD COLUMN IF NOT EXISTS allow_qty_decimal boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS min_qty numeric;

-- Snapshot of decimal qty & unit for transactions
ALTER TABLE public.merchant_transactions
  ADD COLUMN IF NOT EXISTS qty_decimal numeric,
  ADD COLUMN IF NOT EXISTS unit text;

-- And for orders (customer portal purchases of services)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS qty_decimal numeric,
  ADD COLUMN IF NOT EXISTS unit text;

-- Change qty in merchant_transactions to numeric to support decimals natively going forward
ALTER TABLE public.merchant_transactions
  ALTER COLUMN qty TYPE numeric USING qty::numeric;
