-- Fix FK constraint: allow product deletion by setting product_id to NULL in merchant_transactions
ALTER TABLE public.merchant_transactions
  DROP CONSTRAINT merchant_transactions_product_id_fkey;

ALTER TABLE public.merchant_transactions
  ADD CONSTRAINT merchant_transactions_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.merchant_products(id) ON DELETE SET NULL;
