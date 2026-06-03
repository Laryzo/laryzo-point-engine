
INSERT INTO public.system_settings (key, value, description)
VALUES ('merchant_app_fee_percent', '5', 'Persentase biaya aplikasi yang dipotong dari setiap transaksi mitra (default 5)')
ON CONFLICT (key) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users read public settings" ON public.system_settings;
CREATE POLICY "Authenticated users read public settings" ON public.system_settings
  FOR SELECT USING (
    (key = ANY (ARRAY['admin_ppob_wa_number'::text, 'ppob_fallback_enabled'::text, 'min_topup_amount'::text, 'merchant_app_fee_percent'::text]))
    AND (is_authenticated_customer() OR is_authenticated_merchant() OR is_authenticated_admin())
  );
