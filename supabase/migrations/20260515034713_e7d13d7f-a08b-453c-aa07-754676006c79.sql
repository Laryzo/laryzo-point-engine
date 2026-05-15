
-- Bank accounts table
CREATE TABLE public.bank_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage bank accounts" ON public.bank_accounts
  FOR ALL USING (is_authenticated_admin()) WITH CHECK (is_authenticated_admin());

CREATE POLICY "Customers read active bank accounts" ON public.bank_accounts
  FOR SELECT USING (is_authenticated_customer() AND is_active = true);

CREATE TRIGGER bank_accounts_updated_at
  BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Topup requests table
CREATE TABLE public.topup_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  unique_code INTEGER NOT NULL CHECK (unique_code BETWEEN 100 AND 999),
  transfer_amount NUMERIC NOT NULL,
  bank_account_id UUID,
  bank_snapshot JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  customer_confirmed_at TIMESTAMPTZ,
  processed_by TEXT,
  processed_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_topup_requests_customer ON public.topup_requests(customer_id);
CREATE INDEX idx_topup_requests_status ON public.topup_requests(status);

ALTER TABLE public.topup_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers read own topup" ON public.topup_requests
  FOR SELECT USING (is_authenticated_customer() AND customer_id = get_current_customer_id());

CREATE POLICY "Customers insert own topup" ON public.topup_requests
  FOR INSERT WITH CHECK (is_authenticated_customer() AND customer_id = get_current_customer_id());

CREATE POLICY "Customers confirm own topup" ON public.topup_requests
  FOR UPDATE USING (
    is_authenticated_customer()
    AND customer_id = get_current_customer_id()
    AND status = 'pending'
  );

CREATE POLICY "Admins read all topup" ON public.topup_requests
  FOR SELECT USING (is_authenticated_admin());

CREATE POLICY "Admins update topup" ON public.topup_requests
  FOR UPDATE USING (is_authenticated_admin());

CREATE TRIGGER topup_requests_updated_at
  BEFORE UPDATE ON public.topup_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add wallet_used to orders / merchant_transactions
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS wallet_used NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.merchant_transactions ADD COLUMN IF NOT EXISTS wallet_used NUMERIC NOT NULL DEFAULT 0;

-- Trigger: auto credit wallet on approval
CREATE OR REPLACE FUNCTION public.apply_topup_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wallet_uuid UUID;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    -- Ensure wallet exists
    SELECT id INTO wallet_uuid FROM public.wallet_balances
      WHERE user_id = NEW.customer_id AND user_type = 'customer';

    IF wallet_uuid IS NULL THEN
      INSERT INTO public.wallet_balances (user_id, user_type, balance)
      VALUES (NEW.customer_id, 'customer', 0)
      RETURNING id INTO wallet_uuid;
    END IF;

    -- Credit balance
    UPDATE public.wallet_balances
      SET balance = COALESCE(balance, 0) + NEW.amount,
          updated_at = now()
      WHERE id = wallet_uuid;

    -- Insert wallet transaction
    INSERT INTO public.wallet_transactions (wallet_id, amount, type, description)
    VALUES (
      wallet_uuid,
      NEW.amount,
      'credit',
      'Top up disetujui (Rp ' || NEW.amount::text || ', kode ' || NEW.unique_code::text || ')'
    );

    NEW.processed_at := COALESCE(NEW.processed_at, now());
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER apply_topup_approval_trg
  BEFORE UPDATE ON public.topup_requests
  FOR EACH ROW EXECUTE FUNCTION public.apply_topup_approval();

-- Public settings additions
INSERT INTO public.system_settings (key, value, description)
VALUES
  ('min_topup_amount', '10000', 'Minimum top up amount (IDR)'),
  ('admin_topup_email', '', 'Email admin penerima notifikasi top up')
ON CONFLICT (key) DO NOTHING;

-- Allow customers to read min_topup_amount
DROP POLICY IF EXISTS "Authenticated users read public settings" ON public.system_settings;
CREATE POLICY "Authenticated users read public settings" ON public.system_settings
  FOR SELECT USING (
    (key = ANY (ARRAY['admin_ppob_wa_number'::text, 'ppob_fallback_enabled'::text, 'min_topup_amount'::text]))
    AND (is_authenticated_customer() OR is_authenticated_merchant() OR is_authenticated_admin())
  );
