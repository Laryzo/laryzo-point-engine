
-- =============================================
-- FASE 1: Database & Scaling - SuperApp Laryzo
-- =============================================

-- 1. Expand orders table with new columns
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_type TEXT NOT NULL DEFAULT 'ppob',
  ADD COLUMN IF NOT EXISTS delivery_type TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS delivery_status TEXT,
  ADD COLUMN IF NOT EXISTS merchant_id UUID REFERENCES public.merchants(id),
  ADD COLUMN IF NOT EXISTS pickup_address TEXT,
  ADD COLUMN IF NOT EXISTS delivery_address TEXT,
  ADD COLUMN IF NOT EXISTS delivery_notes TEXT;

-- 2. Performance indexes on orders
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_merchant_id ON public.orders(merchant_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON public.orders(order_type);

-- 3. Performance indexes on merchant_transactions
CREATE INDEX IF NOT EXISTS idx_merchant_transactions_merchant_id ON public.merchant_transactions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_transactions_created_at ON public.merchant_transactions(created_at DESC);

-- 4. Wallet tables (preparation only)
CREATE TABLE IF NOT EXISTS public.wallet_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_type TEXT NOT NULL DEFAULT 'customer',
  balance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID NOT NULL REFERENCES public.wallet_balances(id),
  amount NUMERIC NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'credit',
  reference_order_id UUID REFERENCES public.orders(id),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. RLS on wallet tables
ALTER TABLE public.wallet_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Wallet balances policies
CREATE POLICY "Admins manage wallet balances"
  ON public.wallet_balances FOR ALL
  USING (is_authenticated_admin());

CREATE POLICY "Customers read own wallet"
  ON public.wallet_balances FOR SELECT
  USING (is_authenticated_customer() AND user_id = get_current_customer_id() AND user_type = 'customer');

CREATE POLICY "Merchants read own wallet"
  ON public.wallet_balances FOR SELECT
  USING (is_authenticated_merchant() AND user_id = get_current_merchant_id() AND user_type = 'merchant');

CREATE POLICY "No anon access wallet balances"
  ON public.wallet_balances FOR ALL
  USING (false);

-- Wallet transactions policies
CREATE POLICY "Admins manage wallet transactions"
  ON public.wallet_transactions FOR ALL
  USING (is_authenticated_admin());

CREATE POLICY "Users read own wallet transactions"
  ON public.wallet_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.wallet_balances wb
      WHERE wb.id = wallet_id
      AND (
        (is_authenticated_customer() AND wb.user_id = get_current_customer_id() AND wb.user_type = 'customer')
        OR (is_authenticated_merchant() AND wb.user_id = get_current_merchant_id() AND wb.user_type = 'merchant')
      )
    )
  );

CREATE POLICY "No anon access wallet transactions"
  ON public.wallet_transactions FOR ALL
  USING (false);

-- 6. Indexes on wallet tables
CREATE INDEX IF NOT EXISTS idx_wallet_balances_user ON public.wallet_balances(user_id, user_type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet ON public.wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created ON public.wallet_transactions(created_at DESC);

-- 7. Updated_at trigger for wallet_balances
CREATE TRIGGER update_wallet_balances_updated_at
  BEFORE UPDATE ON public.wallet_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
