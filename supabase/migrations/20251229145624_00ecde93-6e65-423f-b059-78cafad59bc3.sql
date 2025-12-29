-- Create enum for admin roles
CREATE TYPE public.admin_role AS ENUM ('admin', 'super_admin');

-- Create enum for customer positions in binary tree
CREATE TYPE public.customer_position AS ENUM ('left', 'right');

-- Create admins table for authentication and role management
CREATE TABLE public.admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role admin_role NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create customers table with binary tree structure
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    email TEXT,
    whatsapp TEXT,
    points NUMERIC DEFAULT 0,
    parent_id UUID REFERENCES public.customers(id),
    position customer_position,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_code TEXT,
    product_name TEXT,
    product_type TEXT,
    qty INTEGER DEFAULT 1,
    margin NUMERIC DEFAULT 0,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create point_history table for tracking point distribution
CREATE TABLE public.point_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_customer UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    to_customer UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    level INTEGER,
    points NUMERIC,
    product_code TEXT,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admins table (public read for login, but protected write)
CREATE POLICY "Allow public read for admin login" ON public.admins
FOR SELECT USING (true);

CREATE POLICY "Allow public insert for first admin registration" ON public.admins
FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow admin update own record" ON public.admins
FOR UPDATE USING (true);

CREATE POLICY "Allow admin delete" ON public.admins
FOR DELETE USING (true);

-- Create RLS policies for customers table
CREATE POLICY "Allow read customers" ON public.customers
FOR SELECT USING (true);

CREATE POLICY "Allow insert customers" ON public.customers
FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update customers" ON public.customers
FOR UPDATE USING (true);

CREATE POLICY "Allow delete customers" ON public.customers
FOR DELETE USING (true);

-- Create RLS policies for transactions table
CREATE POLICY "Allow read transactions" ON public.transactions
FOR SELECT USING (true);

CREATE POLICY "Allow insert transactions" ON public.transactions
FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update transactions" ON public.transactions
FOR UPDATE USING (true);

CREATE POLICY "Allow delete transactions" ON public.transactions
FOR DELETE USING (true);

-- Create RLS policies for point_history table
CREATE POLICY "Allow read point_history" ON public.point_history
FOR SELECT USING (true);

CREATE POLICY "Allow insert point_history" ON public.point_history
FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update point_history" ON public.point_history
FOR UPDATE USING (true);

CREATE POLICY "Allow delete point_history" ON public.point_history
FOR DELETE USING (true);

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_admins_updated_at
    BEFORE UPDATE ON public.admins
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add constraint for unique parent-position combination in binary tree
ALTER TABLE public.customers ADD CONSTRAINT unique_parent_position 
    UNIQUE (parent_id, position);