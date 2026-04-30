-- Allow authenticated customers and merchants to read public-safe system settings
-- (currently only the admin WhatsApp number for PPOB fallback)
CREATE POLICY "Authenticated users read public settings"
ON public.system_settings
FOR SELECT
TO public
USING (
  key IN ('admin_ppob_wa_number', 'ppob_fallback_enabled')
  AND (is_authenticated_customer() OR is_authenticated_merchant() OR is_authenticated_admin())
);