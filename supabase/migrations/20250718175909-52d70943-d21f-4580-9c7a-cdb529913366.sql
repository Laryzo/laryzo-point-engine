
-- Create enum for admin roles
CREATE TYPE admin_role AS ENUM ('admin', 'super_admin');

-- Create enum for customer positions in binary tree
CREATE TYPE customer_position AS ENUM ('left', 'right');

-- Create admins table for authentication and role management
CREATE TABLE public.admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role admin_role NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Create customers table with binary tree structure
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    email TEXT,
    whatsapp TEXT,
    parent_id UUID REFERENCES public.customers(id),
    position customer_position,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_code TEXT,
    product_name TEXT,
    product_type TEXT,
    qty INTEGER,
    margin NUMERIC,
    customer_id UUID REFERENCES public.customers(id),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Create point_history table for tracking point distribution
CREATE TABLE public.point_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_customer UUID REFERENCES public.customers(id),
    to_customer UUID REFERENCES public.customers(id),
    level INTEGER,
    points NUMERIC,
    product_code TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for admins (admins can see all data)
CREATE POLICY "Admins can view all admin data" ON public.admins
    FOR ALL USING (true);

CREATE POLICY "Admins can view all customer data" ON public.customers
    FOR ALL USING (true);

CREATE POLICY "Admins can view all transaction data" ON public.transactions
    FOR ALL USING (true);

CREATE POLICY "Admins can view all point history data" ON public.point_history
    FOR ALL USING (true);

-- Insert sample super admin
INSERT INTO public.admins (email, password_hash, role) VALUES 
('admin@laryzo.com', '$2b$10$dummy.hash.for.testing', 'super_admin');

-- Add constraints for binary tree structure
ALTER TABLE public.customers ADD CONSTRAINT unique_parent_position 
    UNIQUE (parent_id, position);

-- Add check constraint to ensure maximum 2 children per parent
CREATE OR REPLACE FUNCTION check_max_children()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.parent_id IS NOT NULL THEN
        IF (SELECT COUNT(*) FROM public.customers 
            WHERE parent_id = NEW.parent_id) >= 2 THEN
            RAISE EXCEPTION 'Maximum 2 children per parent allowed';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_max_children
    BEFORE INSERT OR UPDATE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION check_max_children();
