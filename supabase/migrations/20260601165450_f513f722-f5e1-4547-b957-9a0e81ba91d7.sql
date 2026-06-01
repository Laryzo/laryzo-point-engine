
-- Add FK so PostgREST embedding works in admin top up list
ALTER TABLE public.topup_requests
  ADD CONSTRAINT topup_requests_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;

-- Allow super admins to delete top up history
CREATE POLICY "Super admins delete topup"
ON public.topup_requests
FOR DELETE
USING (is_super_admin());

GRANT DELETE ON public.topup_requests TO authenticated;
