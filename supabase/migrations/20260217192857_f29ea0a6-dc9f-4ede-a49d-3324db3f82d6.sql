
-- Add logo_url column to merchants
ALTER TABLE public.merchants ADD COLUMN logo_url text;

-- Create storage bucket for merchant logos
INSERT INTO storage.buckets (id, name, public) VALUES ('merchant-logos', 'merchant-logos', true);

-- Storage policies for merchant logos
CREATE POLICY "Anyone can view merchant logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'merchant-logos');

CREATE POLICY "Authenticated merchants can upload logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'merchant-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated merchants can update logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'merchant-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated merchants can delete logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'merchant-logos' AND auth.role() = 'authenticated');
