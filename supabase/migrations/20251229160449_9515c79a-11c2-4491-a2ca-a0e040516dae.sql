-- Add new columns for consumer price and cost price
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS harga_konsumen numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS harga_pokok numeric DEFAULT 0;

-- Migrate existing data: copy margin to harga_konsumen (assuming margin was actually the consumer price)
-- and set harga_pokok to 0, so profit (margin) = harga_konsumen - harga_pokok
UPDATE public.transactions 
SET harga_konsumen = margin, harga_pokok = 0
WHERE harga_konsumen IS NULL OR harga_konsumen = 0;