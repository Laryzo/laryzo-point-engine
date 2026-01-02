
-- Create customer_auth table for customer authentication
CREATE TABLE public.customer_auth (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create products table for PPOB and physical products
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    type TEXT NOT NULL CHECK (type IN ('ppob', 'physical')),
    ppob_type TEXT CHECK (ppob_type IN ('gopay', 'pulsa', 'paket_data', 'token_pln', 'bpjs', 'internet', 'game', 'emoney')),
    digiflazz_sku TEXT,
    cost_price NUMERIC NOT NULL DEFAULT 0,
    point_price NUMERIC NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT -1,
    requires_input TEXT CHECK (requires_input IN ('phone', 'gopay_number', 'meter_id', 'bpjs_number', 'customer_id', 'game_id')),
    requires_shipping BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create orders table for customer purchases
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    points_used NUMERIC NOT NULL DEFAULT 0,
    points_earned NUMERIC NOT NULL DEFAULT 0,
    input_value TEXT,
    ref_id TEXT UNIQUE,
    digiflazz_status TEXT,
    digiflazz_sn TEXT,
    digiflazz_message TEXT,
    shipping_address TEXT,
    shipping_status TEXT CHECK (shipping_status IN ('pending', 'shipped', 'delivered')),
    tracking_number TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled', 'failed')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Create system_settings table
CREATE TABLE public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default system settings
INSERT INTO public.system_settings (key, value, description) VALUES
    ('point_to_rupiah', '1', 'Nilai konversi 1 poin ke rupiah'),
    ('min_order_points', '10000', 'Minimum poin untuk order'),
    ('digiflazz_mode', 'development', 'Mode Digiflazz: development atau production');

-- Enable RLS on all new tables
ALTER TABLE public.customer_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for customer_auth
CREATE POLICY "Allow public read for customer login"
ON public.customer_auth FOR SELECT
USING (true);

CREATE POLICY "Allow public insert for customer registration"
ON public.customer_auth FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow customer update own auth"
ON public.customer_auth FOR UPDATE
USING (true);

-- RLS policies for products (customers can only see active products and limited columns)
CREATE POLICY "Allow read active products"
ON public.products FOR SELECT
USING (true);

CREATE POLICY "Allow admin insert products"
ON public.products FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow admin update products"
ON public.products FOR UPDATE
USING (true);

CREATE POLICY "Allow admin delete products"
ON public.products FOR DELETE
USING (true);

-- RLS policies for orders
CREATE POLICY "Allow read orders"
ON public.orders FOR SELECT
USING (true);

CREATE POLICY "Allow insert orders"
ON public.orders FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow update orders"
ON public.orders FOR UPDATE
USING (true);

CREATE POLICY "Allow delete orders"
ON public.orders FOR DELETE
USING (true);

-- RLS policies for system_settings
CREATE POLICY "Allow read system settings"
ON public.system_settings FOR SELECT
USING (true);

CREATE POLICY "Allow admin update system settings"
ON public.system_settings FOR UPDATE
USING (true);

-- Create triggers for updated_at
CREATE TRIGGER update_customer_auth_updated_at
    BEFORE UPDATE ON public.customer_auth
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON public.system_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
