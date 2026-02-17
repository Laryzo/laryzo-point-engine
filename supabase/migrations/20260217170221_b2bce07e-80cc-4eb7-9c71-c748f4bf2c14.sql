
-- Merchants table (store owners/UMKM partners)
CREATE TABLE public.merchants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE,
  whatsapp text,
  business_name text,
  business_address text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;

-- Merchant auth table
CREATE TABLE public.merchant_auth (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  last_login timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.merchant_auth ENABLE ROW LEVEL SECURITY;

-- Merchant products (products owned by the merchant)
CREATE TABLE public.merchant_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT -1,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.merchant_products ENABLE ROW LEVEL SECURITY;

-- Merchant transactions (POS sales records)
CREATE TABLE public.merchant_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.merchant_products(id),
  customer_id uuid REFERENCES public.customers(id),
  product_name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  qty integer NOT NULL DEFAULT 1,
  total numeric NOT NULL DEFAULT 0,
  laryzo_fee numeric NOT NULL DEFAULT 0,
  customer_points_earned numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.merchant_transactions ENABLE ROW LEVEL SECURITY;

-- DB function: is_authenticated_merchant
CREATE OR REPLACE FUNCTION public.is_authenticated_merchant()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
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
    SELECT 1 FROM public.merchant_auth WHERE email = user_email
  );
END;
$$;

-- DB function: get_current_merchant_id
CREATE OR REPLACE FUNCTION public.get_current_merchant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  claims json;
  user_email text;
  merchant_uuid uuid;
BEGIN
  BEGIN
    claims := current_setting('request.jwt.claims', true)::json;
    user_email := claims->>'email';
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
  IF user_email IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT m.id INTO merchant_uuid
  FROM public.merchants m
  INNER JOIN public.merchant_auth ma ON ma.merchant_id = m.id
  WHERE ma.email = user_email
  LIMIT 1;
  RETURN merchant_uuid;
END;
$$;

-- RLS policies for merchants
CREATE POLICY "Admins manage merchants" ON public.merchants FOR ALL USING (is_authenticated_admin());
CREATE POLICY "Merchants read own" ON public.merchants FOR SELECT USING (is_authenticated_merchant() AND id = get_current_merchant_id());
CREATE POLICY "No anon access merchants" ON public.merchants FOR ALL USING (false);

-- RLS policies for merchant_auth
CREATE POLICY "No public access merchant auth" ON public.merchant_auth FOR SELECT USING (false);
CREATE POLICY "No direct insert merchant auth" ON public.merchant_auth FOR INSERT WITH CHECK (false);
CREATE POLICY "Merchants update own auth" ON public.merchant_auth FOR UPDATE USING (is_authenticated_merchant() AND email = (current_setting('request.jwt.claims', true)::json->>'email'));
CREATE POLICY "No public delete merchant auth" ON public.merchant_auth FOR DELETE USING (false);

-- RLS policies for merchant_products
CREATE POLICY "Admins manage merchant products" ON public.merchant_products FOR ALL USING (is_authenticated_admin());
CREATE POLICY "Merchants manage own products" ON public.merchant_products FOR ALL USING (is_authenticated_merchant() AND merchant_id = get_current_merchant_id());
CREATE POLICY "No anon access merchant products" ON public.merchant_products FOR ALL USING (false);

-- RLS policies for merchant_transactions
CREATE POLICY "Admins read merchant transactions" ON public.merchant_transactions FOR SELECT USING (is_authenticated_admin());
CREATE POLICY "Merchants manage own transactions" ON public.merchant_transactions FOR ALL USING (is_authenticated_merchant() AND merchant_id = get_current_merchant_id());
CREATE POLICY "No anon access merchant transactions" ON public.merchant_transactions FOR ALL USING (false);

-- Updated_at triggers
CREATE TRIGGER update_merchants_updated_at BEFORE UPDATE ON public.merchants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_merchant_auth_updated_at BEFORE UPDATE ON public.merchant_auth FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_merchant_products_updated_at BEFORE UPDATE ON public.merchant_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_merchant_transactions_updated_at BEFORE UPDATE ON public.merchant_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
