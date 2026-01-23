-- Fix: Remove direct public access to products table, only allow through view
-- First drop the overly permissive policy
DROP POLICY IF EXISTS "Public read active products via view" ON public.products;

-- Create a restrictive policy - only admins or authenticated customers can read products
CREATE POLICY "Authenticated users read active products" ON public.products
FOR SELECT USING (
  is_authenticated_admin() OR 
  (is_authenticated_customer() AND is_active = true)
);