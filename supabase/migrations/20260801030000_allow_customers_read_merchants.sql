
-- Allow customers to read merchant information so they can see store names in the shop
-- Drop existing policy if any
DROP POLICY IF EXISTS "Customers can read merchants" ON public.merchants;
DROP POLICY IF EXISTS "Allow authenticated to read merchants" ON public.merchants;

-- Drop ALL existing policies on merchants to start fresh
DROP POLICY IF EXISTS "Admins manage merchants" ON public.merchants;
DROP POLICY IF EXISTS "Merchants read own" ON public.merchants;
DROP POLICY IF EXISTS "No anon access merchants" ON public.merchants;
DROP POLICY IF EXISTS "Customers can read merchants" ON public.merchants;
DROP POLICY IF EXISTS "Allow authenticated to read merchants" ON public.merchants;
DROP POLICY IF EXISTS "Allow anon to read merchants" ON public.merchants;

-- Recreate policies
CREATE POLICY "Admins manage merchants" ON public.merchants FOR ALL TO authenticated USING (is_authenticated_admin());
CREATE POLICY "Allow public read merchants" ON public.merchants FOR SELECT TO public USING (true);

-- Ensure the roles have select permission on the table
GRANT SELECT ON public.merchants TO authenticated, anon;

-- Grant execute back to public so RLS policies in other tables can use these functions
-- These functions are SECURITY DEFINER and safe to call as they check internal JWT claims
GRANT EXECUTE ON FUNCTION public.is_authenticated_customer() TO public;
GRANT EXECUTE ON FUNCTION public.is_authenticated_merchant() TO public;
GRANT EXECUTE ON FUNCTION public.is_authenticated_admin() TO public;
GRANT EXECUTE ON FUNCTION public.get_current_customer_id() TO public;
GRANT EXECUTE ON FUNCTION public.get_current_merchant_id() TO public;
