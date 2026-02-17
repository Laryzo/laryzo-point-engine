
-- Create storage bucket for merchant product images
INSERT INTO storage.buckets (id, name, public) VALUES ('merchant-products', 'merchant-products', true);

-- Allow anyone to view merchant product images (public bucket)
CREATE POLICY "Public read merchant product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'merchant-products');

-- Allow merchants to upload their own images (folder = merchant_id)
CREATE POLICY "Merchants upload own product images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'merchant-products' 
  AND is_authenticated_merchant() 
  AND (storage.foldername(name))[1] = get_current_merchant_id()::text
);

-- Allow merchants to update their own images
CREATE POLICY "Merchants update own product images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'merchant-products' 
  AND is_authenticated_merchant() 
  AND (storage.foldername(name))[1] = get_current_merchant_id()::text
);

-- Allow merchants to delete their own images
CREATE POLICY "Merchants delete own product images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'merchant-products' 
  AND is_authenticated_merchant() 
  AND (storage.foldername(name))[1] = get_current_merchant_id()::text
);

-- Allow admins full access to merchant product images
CREATE POLICY "Admins manage merchant product images"
ON storage.objects FOR ALL
USING (bucket_id = 'merchant-products' AND is_authenticated_admin());

-- Allow customers to read active merchant products
CREATE POLICY "Customers read active merchant products"
ON merchant_products FOR SELECT
USING (is_authenticated_customer() AND is_active = true);
