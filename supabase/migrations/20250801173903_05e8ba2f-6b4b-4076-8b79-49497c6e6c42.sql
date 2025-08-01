-- PHASE 1: Fix Critical Security Issues

-- 1. Enable RLS on point_history_backup table
ALTER TABLE public.point_history_backup ENABLE ROW LEVEL SECURITY;

-- 2. Replace all dangerous RLS policies with secure ones
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Admins can view all admin records" ON public.admins;
DROP POLICY IF EXISTS "Admins can insert admin records" ON public.admins;
DROP POLICY IF EXISTS "Admins can update admin records" ON public.admins;
DROP POLICY IF EXISTS "Super admins can delete admin records" ON public.admins;

DROP POLICY IF EXISTS "Admins can view all customers" ON public.customers;
DROP POLICY IF EXISTS "Admins can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Admins can update customers" ON public.customers;
DROP POLICY IF EXISTS "Admins can delete customers" ON public.customers;

DROP POLICY IF EXISTS "Admins can view all point history" ON public.point_history;
DROP POLICY IF EXISTS "Admins can insert point history" ON public.point_history;
DROP POLICY IF EXISTS "Admins can update point history" ON public.point_history;
DROP POLICY IF EXISTS "Admins can delete point history" ON public.point_history;

DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can insert transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can update transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can delete transactions" ON public.transactions;

-- 3. Create security definer function to check admin authentication
-- This prevents infinite recursion in RLS policies
CREATE OR REPLACE FUNCTION public.is_authenticated_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins 
    WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    AND current_setting('request.jwt.claims', true)::json->>'role' = 'authenticated'
  );
$$;

-- 4. Create new secure RLS policies for admins table
CREATE POLICY "Authenticated admins can view admin records" 
ON public.admins FOR SELECT 
USING (public.is_authenticated_admin());

CREATE POLICY "Authenticated admins can insert admin records" 
ON public.admins FOR INSERT 
WITH CHECK (public.is_authenticated_admin());

CREATE POLICY "Authenticated admins can update admin records" 
ON public.admins FOR UPDATE 
USING (public.is_authenticated_admin());

CREATE POLICY "Authenticated admins can delete admin records" 
ON public.admins FOR DELETE 
USING (public.is_authenticated_admin());

-- 5. Create secure RLS policies for customers table
CREATE POLICY "Authenticated admins can view customers" 
ON public.customers FOR SELECT 
USING (public.is_authenticated_admin());

CREATE POLICY "Authenticated admins can insert customers" 
ON public.customers FOR INSERT 
WITH CHECK (public.is_authenticated_admin());

CREATE POLICY "Authenticated admins can update customers" 
ON public.customers FOR UPDATE 
USING (public.is_authenticated_admin());

CREATE POLICY "Authenticated admins can delete customers" 
ON public.customers FOR DELETE 
USING (public.is_authenticated_admin());

-- 6. Create secure RLS policies for transactions table
CREATE POLICY "Authenticated admins can view transactions" 
ON public.transactions FOR SELECT 
USING (public.is_authenticated_admin());

CREATE POLICY "Authenticated admins can insert transactions" 
ON public.transactions FOR INSERT 
WITH CHECK (public.is_authenticated_admin());

CREATE POLICY "Authenticated admins can update transactions" 
ON public.transactions FOR UPDATE 
USING (public.is_authenticated_admin());

CREATE POLICY "Authenticated admins can delete transactions" 
ON public.transactions FOR DELETE 
USING (public.is_authenticated_admin());

-- 7. Create secure RLS policies for point_history table
CREATE POLICY "Authenticated admins can view point history" 
ON public.point_history FOR SELECT 
USING (public.is_authenticated_admin());

CREATE POLICY "Authenticated admins can insert point history" 
ON public.point_history FOR INSERT 
WITH CHECK (public.is_authenticated_admin());

CREATE POLICY "Authenticated admins can update point history" 
ON public.point_history FOR UPDATE 
USING (public.is_authenticated_admin());

CREATE POLICY "Authenticated admins can delete point history" 
ON public.point_history FOR DELETE 
USING (public.is_authenticated_admin());

-- 8. Create secure RLS policies for point_history_backup table
CREATE POLICY "Authenticated admins can view point history backup" 
ON public.point_history_backup FOR SELECT 
USING (public.is_authenticated_admin());

-- 9. Fix the function search path issue
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 10. Fix delete function search path
CREATE OR REPLACE FUNCTION public.delete_point_history_on_transaction_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM point_history WHERE transaction_id = OLD.id;
  RETURN OLD;
END;
$$;