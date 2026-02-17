
ALTER TABLE public.merchant_transactions
  DROP CONSTRAINT merchant_transactions_customer_id_fkey;

ALTER TABLE public.merchant_transactions
  ADD CONSTRAINT merchant_transactions_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;
