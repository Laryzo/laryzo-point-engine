-- Make product_id nullable for merchant product orders
ALTER TABLE public.orders ALTER COLUMN product_id DROP NOT NULL;

-- Add index for merchant_id on orders
CREATE INDEX IF NOT EXISTS idx_orders_merchant_id ON public.orders (merchant_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
