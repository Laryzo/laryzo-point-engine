
CREATE POLICY "Public can view landing assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'landing-assets');

CREATE POLICY "Admins can upload landing assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'landing-assets' AND public.is_authenticated_admin());

CREATE POLICY "Admins can update landing assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'landing-assets' AND public.is_authenticated_admin());

CREATE POLICY "Admins can delete landing assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'landing-assets' AND public.is_authenticated_admin());
