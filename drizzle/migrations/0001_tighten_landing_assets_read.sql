-- SECURITY FIX: tighten landing-assets storage read access.
-- The old "Public can view landing assets" policy allowed anyone (anon included)
-- to SELECT every object in the private landing-assets bucket with no owner binding.
-- Landing pages render images via pre-signed URLs, so anonymous SELECT is not needed.
-- Signed-URL creation only requires SELECT for authenticated admins, which the new
-- policy preserves.

DROP POLICY IF EXISTS "Public can view landing assets" ON storage.objects;

CREATE POLICY "Admins can view landing assets"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'landing-assets' AND public.is_authenticated_admin());
