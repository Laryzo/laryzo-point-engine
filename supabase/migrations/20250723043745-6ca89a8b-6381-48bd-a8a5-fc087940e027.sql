-- Enable RLS on all tables
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_history ENABLE ROW LEVEL SECURITY;

-- Create policies for admins table
CREATE POLICY "Admins can view all admin records" ON public.admins
FOR SELECT USING (true);

CREATE POLICY "Admins can insert admin records" ON public.admins
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update admin records" ON public.admins
FOR UPDATE USING (true);

CREATE POLICY "Super admins can delete admin records" ON public.admins
FOR DELETE USING (true);

-- Create policies for customers table
CREATE POLICY "Admins can view all customers" ON public.customers
FOR SELECT USING (true);

CREATE POLICY "Admins can insert customers" ON public.customers
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update customers" ON public.customers
FOR UPDATE USING (true);

CREATE POLICY "Admins can delete customers" ON public.customers
FOR DELETE USING (true);

-- Create policies for transactions table
CREATE POLICY "Admins can view all transactions" ON public.transactions
FOR SELECT USING (true);

CREATE POLICY "Admins can insert transactions" ON public.transactions
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update transactions" ON public.transactions
FOR UPDATE USING (true);

CREATE POLICY "Admins can delete transactions" ON public.transactions
FOR DELETE USING (true);

-- Create policies for point_history table
CREATE POLICY "Admins can view all point history" ON public.point_history
FOR SELECT USING (true);

CREATE POLICY "Admins can insert point history" ON public.point_history
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update point history" ON public.point_history
FOR UPDATE USING (true);

CREATE POLICY "Admins can delete point history" ON public.point_history
FOR DELETE USING (true);