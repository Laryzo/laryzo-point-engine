-- Add merchant_price column to merchant_transactions to track partner's net price per unit
ALTER TABLE public.merchant_transactions
ADD COLUMN IF NOT EXISTS merchant_price numeric NOT NULL DEFAULT 0;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_merchant_transactions_merchant_price ON public.merchant_transactions(merchant_price);
