
CREATE TABLE public.landing_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL DEFAULT '',
  theme_draft jsonb NOT NULL DEFAULT '{}'::jsonb,
  theme_published jsonb NOT NULL DEFAULT '{}'::jsonb,
  sections_draft jsonb NOT NULL DEFAULT '[]'::jsonb,
  sections_published jsonb NOT NULL DEFAULT '[]'::jsonb,
  settings_draft jsonb NOT NULL DEFAULT '{}'::jsonb,
  settings_published jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.landing_pages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.landing_pages TO authenticated;
GRANT ALL ON public.landing_pages TO service_role;

ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read landing pages"
  ON public.landing_pages FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert landing pages"
  ON public.landing_pages FOR INSERT
  TO authenticated
  WITH CHECK (public.is_authenticated_admin());

CREATE POLICY "Admins can update landing pages"
  ON public.landing_pages FOR UPDATE
  TO authenticated
  USING (public.is_authenticated_admin())
  WITH CHECK (public.is_authenticated_admin());

CREATE POLICY "Super admins can delete landing pages"
  ON public.landing_pages FOR DELETE
  TO authenticated
  USING (public.is_super_admin());

CREATE TRIGGER trg_landing_pages_updated_at
  BEFORE UPDATE ON public.landing_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
