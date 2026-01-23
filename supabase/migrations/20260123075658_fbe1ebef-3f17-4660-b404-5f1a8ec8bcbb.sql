-- Add defense-in-depth: explicit public denial for system_settings
CREATE POLICY "No public access system settings" ON public.system_settings
FOR ALL TO public USING (false);

-- Add explicit anon denial for customers table
CREATE POLICY "No anon access to customers" ON public.customers
FOR ALL TO anon USING (false);

-- Add explicit anon denial for products table  
CREATE POLICY "No anon access to products" ON public.products
FOR ALL TO anon USING (false);