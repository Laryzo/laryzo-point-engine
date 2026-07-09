-- Ensure landing page settings columns exist and refresh PostgREST schema cache.
-- This repairs environments where the columns exist in code/types but are still
-- missing from the runtime schema cache.

ALTER TABLE IF EXISTS public.landing_pages
  ADD COLUMN IF NOT EXISTS settings_draft jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS settings_published jsonb NOT NULL DEFAULT '{}'::jsonb;

NOTIFY pgrst, 'reload schema';
