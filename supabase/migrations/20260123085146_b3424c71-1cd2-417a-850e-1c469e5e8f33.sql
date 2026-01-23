-- Create table to cache Digiflazz price list
CREATE TABLE public.digiflazz_price_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_sku_code TEXT NOT NULL UNIQUE,
  product_name TEXT NOT NULL,
  category TEXT,
  brand TEXT,
  type TEXT,
  seller_name TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  buyer_product_status BOOLEAN DEFAULT true,
  seller_product_status BOOLEAN DEFAULT true,
  unlimited_stock BOOLEAN DEFAULT false,
  stock INTEGER DEFAULT 0,
  multi BOOLEAN DEFAULT false,
  start_cut_off TEXT,
  end_cut_off TEXT,
  description TEXT,
  cmd TEXT DEFAULT 'prepaid',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_digiflazz_cache_sku ON public.digiflazz_price_cache(buyer_sku_code);
CREATE INDEX idx_digiflazz_cache_category ON public.digiflazz_price_cache(category);
CREATE INDEX idx_digiflazz_cache_cmd ON public.digiflazz_price_cache(cmd);

-- Add updated_at trigger
CREATE TRIGGER update_digiflazz_cache_updated_at
BEFORE UPDATE ON public.digiflazz_price_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.digiflazz_price_cache ENABLE ROW LEVEL SECURITY;

-- Only admins can manage cache
CREATE POLICY "Admins can manage price cache" ON public.digiflazz_price_cache
FOR ALL USING (public.is_authenticated_admin());

-- Add last_sync tracking to system_settings if not exists
INSERT INTO public.system_settings (key, value)
VALUES ('digiflazz_last_sync', '')
ON CONFLICT (key) DO NOTHING;