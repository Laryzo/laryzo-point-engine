CREATE TABLE public.promo_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  whatsapp text NOT NULL CHECK (whatsapp ~ '^62[0-9]{8,13}$'),
  package text NOT NULL CHECK (char_length(package) BETWEEN 1 AND 100),
  pay_date date NOT NULL,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','followed_up','closed','cancelled')),
  notes text CHECK (notes IS NULL OR char_length(notes) <= 500),
  followed_up_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.promo_reservations TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.promo_reservations TO authenticated;
GRANT ALL ON public.promo_reservations TO service_role;
ALTER TABLE public.promo_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Visitors can reserve promo" ON public.promo_reservations FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'waiting' AND followed_up_at IS NULL AND pay_date BETWEEN current_date AND current_date + 62);
CREATE POLICY "Admins read reservations" ON public.promo_reservations FOR SELECT TO authenticated USING (public.is_authenticated_admin());
CREATE POLICY "Admins update reservations" ON public.promo_reservations FOR UPDATE TO authenticated USING (public.is_authenticated_admin()) WITH CHECK (public.is_authenticated_admin());
CREATE POLICY "Admins delete reservations" ON public.promo_reservations FOR DELETE TO authenticated USING (public.is_authenticated_admin());
CREATE TRIGGER trg_promo_reservations_updated BEFORE UPDATE ON public.promo_reservations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();