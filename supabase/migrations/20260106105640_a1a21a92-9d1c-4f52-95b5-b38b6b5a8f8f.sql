-- Fix CRITICAL security bypass in is_authenticated_admin() function
-- This function was returning true when auth.uid() IS NULL, allowing unauthenticated access

CREATE OR REPLACE FUNCTION public.is_authenticated_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  claims json;
  user_email text;
  user_role text;
BEGIN
  -- Try to get JWT claims
  BEGIN
    claims := current_setting('request.jwt.claims', true)::json;
    user_email := claims->>'email';
    user_role := claims->>'role';
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;
  
  -- Must have email and be authenticated
  IF user_email IS NULL OR user_role != 'authenticated' THEN
    RETURN false;
  END IF;
  
  -- Check if email belongs to an admin
  RETURN EXISTS (
    SELECT 1 FROM public.admins 
    WHERE email = user_email
  );
END;
$$;

-- Create a function to check if a customer is authenticated
CREATE OR REPLACE FUNCTION public.is_authenticated_customer()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  claims json;
  user_email text;
  user_role text;
BEGIN
  BEGIN
    claims := current_setting('request.jwt.claims', true)::json;
    user_email := claims->>'email';
    user_role := claims->>'role';
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;
  
  IF user_email IS NULL OR user_role != 'authenticated' THEN
    RETURN false;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM public.customer_auth 
    WHERE email = user_email
  );
END;
$$;

-- Create satellite_api_keys table for secure key management
CREATE TABLE IF NOT EXISTS public.satellite_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash TEXT NOT NULL UNIQUE,
  client_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  request_count INTEGER DEFAULT 0
);

-- Enable RLS on satellite_api_keys
ALTER TABLE public.satellite_api_keys ENABLE ROW LEVEL SECURITY;

-- Only admins can manage satellite API keys
CREATE POLICY "Admin manage satellite keys" ON public.satellite_api_keys
FOR ALL USING (is_authenticated_admin());

-- Create login_attempts table for rate limiting
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address TEXT,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  success BOOLEAN DEFAULT false
);

-- Enable RLS on login_attempts (only accessible via service role)
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- No public access to login_attempts - only via Edge Functions with service role
CREATE POLICY "No public access login attempts" ON public.login_attempts
FOR ALL USING (false);

-- Update admins policies to be more restrictive
-- First drop existing permissive policies
DROP POLICY IF EXISTS "Allow admin delete" ON public.admins;
DROP POLICY IF EXISTS "Allow admin update own record" ON public.admins;
DROP POLICY IF EXISTS "Allow public insert for first admin registration" ON public.admins;
DROP POLICY IF EXISTS "Allow public read for admin login" ON public.admins;

-- Create new secure policies for admins
-- Login checking must be done via Edge Function with service role
-- Only authenticated admins can read admin list (without password_hash)
CREATE POLICY "Authenticated admins can read admins" ON public.admins
FOR SELECT USING (is_authenticated_admin());

CREATE POLICY "Authenticated admins can update own record" ON public.admins
FOR UPDATE USING (
  is_authenticated_admin() AND 
  email = current_setting('request.jwt.claims', true)::json->>'email'
);

CREATE POLICY "Super admins can delete admins" ON public.admins
FOR DELETE USING (
  is_authenticated_admin() AND
  EXISTS (
    SELECT 1 FROM public.admins 
    WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    AND role = 'super_admin'
  )
);

-- First admin registration handled via Edge Function
CREATE POLICY "No direct insert to admins" ON public.admins
FOR INSERT WITH CHECK (false);

-- Update customer_auth policies
DROP POLICY IF EXISTS "Allow customer update own auth" ON public.customer_auth;
DROP POLICY IF EXISTS "Allow public insert for customer registration" ON public.customer_auth;
DROP POLICY IF EXISTS "Allow public read for customer login" ON public.customer_auth;

-- Customer auth operations go through Edge Functions
CREATE POLICY "No public access to customer auth" ON public.customer_auth
FOR SELECT USING (false);

CREATE POLICY "No direct insert to customer auth" ON public.customer_auth
FOR INSERT WITH CHECK (false);

CREATE POLICY "Customers can update own auth" ON public.customer_auth
FOR UPDATE USING (
  is_authenticated_customer() AND
  email = current_setting('request.jwt.claims', true)::json->>'email'
);

-- Update customers table policies
DROP POLICY IF EXISTS "Allow delete customers" ON public.customers;
DROP POLICY IF EXISTS "Allow insert customers" ON public.customers;
DROP POLICY IF EXISTS "Allow read customers" ON public.customers;
DROP POLICY IF EXISTS "Allow update customers" ON public.customers;

-- Admins can manage all customers
CREATE POLICY "Admins read customers" ON public.customers
FOR SELECT USING (is_authenticated_admin() OR is_authenticated_customer());

CREATE POLICY "Admins insert customers" ON public.customers
FOR INSERT WITH CHECK (is_authenticated_admin());

CREATE POLICY "Admins update customers" ON public.customers
FOR UPDATE USING (is_authenticated_admin());

CREATE POLICY "Admins delete customers" ON public.customers
FOR DELETE USING (is_authenticated_admin());

-- Update transactions policies
DROP POLICY IF EXISTS "Allow delete transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow insert transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow read transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow update transactions" ON public.transactions;

CREATE POLICY "Admins read transactions" ON public.transactions
FOR SELECT USING (is_authenticated_admin());

CREATE POLICY "Admins insert transactions" ON public.transactions
FOR INSERT WITH CHECK (is_authenticated_admin());

CREATE POLICY "Admins update transactions" ON public.transactions
FOR UPDATE USING (is_authenticated_admin());

CREATE POLICY "Admins delete transactions" ON public.transactions
FOR DELETE USING (is_authenticated_admin());

-- Update point_history policies
DROP POLICY IF EXISTS "Allow delete point_history" ON public.point_history;
DROP POLICY IF EXISTS "Allow insert point_history" ON public.point_history;
DROP POLICY IF EXISTS "Allow read point_history" ON public.point_history;
DROP POLICY IF EXISTS "Allow update point_history" ON public.point_history;

CREATE POLICY "Admins read point_history" ON public.point_history
FOR SELECT USING (is_authenticated_admin() OR is_authenticated_customer());

CREATE POLICY "Admins insert point_history" ON public.point_history
FOR INSERT WITH CHECK (is_authenticated_admin());

CREATE POLICY "Admins update point_history" ON public.point_history
FOR UPDATE USING (is_authenticated_admin());

CREATE POLICY "Admins delete point_history" ON public.point_history
FOR DELETE USING (is_authenticated_admin());

-- Update products policies
DROP POLICY IF EXISTS "Allow admin delete products" ON public.products;
DROP POLICY IF EXISTS "Allow admin insert products" ON public.products;
DROP POLICY IF EXISTS "Allow admin update products" ON public.products;
DROP POLICY IF EXISTS "Allow read active products" ON public.products;

-- Public can read active products (for shop)
CREATE POLICY "Public read active products" ON public.products
FOR SELECT USING (is_active = true OR is_authenticated_admin());

CREATE POLICY "Admins insert products" ON public.products
FOR INSERT WITH CHECK (is_authenticated_admin());

CREATE POLICY "Admins update products" ON public.products
FOR UPDATE USING (is_authenticated_admin());

CREATE POLICY "Admins delete products" ON public.products
FOR DELETE USING (is_authenticated_admin());

-- Update orders policies
DROP POLICY IF EXISTS "Allow delete orders" ON public.orders;
DROP POLICY IF EXISTS "Allow insert orders" ON public.orders;
DROP POLICY IF EXISTS "Allow read orders" ON public.orders;
DROP POLICY IF EXISTS "Allow update orders" ON public.orders;

CREATE POLICY "Admins and customers read orders" ON public.orders
FOR SELECT USING (is_authenticated_admin() OR is_authenticated_customer());

CREATE POLICY "Customers and admins insert orders" ON public.orders
FOR INSERT WITH CHECK (is_authenticated_admin() OR is_authenticated_customer());

CREATE POLICY "Admins update orders" ON public.orders
FOR UPDATE USING (is_authenticated_admin());

CREATE POLICY "Admins delete orders" ON public.orders
FOR DELETE USING (is_authenticated_admin());

-- Update system_settings policies - CRITICAL: contains Digiflazz credentials
DROP POLICY IF EXISTS "Allow admin insert system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Allow admin update system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Allow read system settings" ON public.system_settings;

CREATE POLICY "Admins read system settings" ON public.system_settings
FOR SELECT USING (is_authenticated_admin());

CREATE POLICY "Admins insert system settings" ON public.system_settings
FOR INSERT WITH CHECK (is_authenticated_admin());

CREATE POLICY "Admins update system settings" ON public.system_settings
FOR UPDATE USING (is_authenticated_admin());