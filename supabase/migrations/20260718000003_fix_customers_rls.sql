-- Security fix: tighten RLS on public.customers
--
-- Previously the SELECT policy allowed ANY authenticated customer to read ALL
-- customer rows (downline tree, PII, points). This migration replaces those
-- permissive policies with ownership-scoped ones:
--   - admins: full CRUD on all rows
--   - customers: SELECT only their own row (matched via customer_auth.email)
--
-- INSERT/UPDATE/DELETE on customers must go through admin-authenticated edge
-- functions (service role), so customer-facing roles get no write access.

-- Drop any previously installed policies that are too permissive
DROP POLICY IF EXISTS "Admins read customers" ON public.customers;
DROP POLICY IF EXISTS "Read own or admin access customers" ON public.customers;
DROP POLICY IF EXISTS "Admins insert customers" ON public.customers;
DROP POLICY IF EXISTS "Admins update customers" ON public.customers;
DROP POLICY IF EXISTS "Admins delete customers" ON public.customers;
DROP POLICY IF EXISTS "Allow read customers" ON public.customers;
DROP POLICY IF EXISTS "Allow update customers" ON public.customers;
DROP POLICY IF EXISTS "Allow insert customers" ON public.customers;
DROP POLICY IF EXISTS "Allow delete customers" ON public.customers;

-- SELECT: admins see all, customers see only their own row
CREATE POLICY "customers_select_own_or_admin" ON public.customers
  FOR SELECT TO authenticated
  USING (
    is_authenticated_admin()
    OR (is_authenticated_customer() AND id = get_current_customer_id())
  );

-- INSERT: only admins (customer registration happens via edge function with service role)
CREATE POLICY "customers_insert_admin" ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (is_authenticated_admin());

-- UPDATE: only admins
CREATE POLICY "customers_update_admin" ON public.customers
  FOR UPDATE TO authenticated
  USING (is_authenticated_admin())
  WITH CHECK (is_authenticated_admin());

-- DELETE: only admins
CREATE POLICY "customers_delete_admin" ON public.customers
  FOR DELETE TO authenticated
  USING (is_authenticated_admin());
