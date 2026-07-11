-- Ensure settings columns exist in landing_pages table.
-- Safe to run multiple times (IF NOT EXISTS).
ALTER TABLE public.landing_pages
  ADD COLUMN IF NOT EXISTS settings_draft    jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS settings_published jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Notify PostgREST to reload its schema cache so the new columns are visible.
NOTIFY pgrst, 'reload schema';
