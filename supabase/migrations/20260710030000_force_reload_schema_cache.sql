-- Force reload schema cache to fix missing 'settings_draft' column error
-- This error usually happens when the column is added but PostgREST cache is stale
ALTER TABLE IF EXISTS public.landing_pages
ADD COLUMN IF NOT EXISTS settings_draft jsonb NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS settings_published jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Explicitly notify PostgREST to reload the schema
NOTIFY pgrst, 'reload schema';
