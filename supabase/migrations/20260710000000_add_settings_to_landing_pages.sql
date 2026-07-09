ALTER TABLE public.landing_pages 
ADD COLUMN IF NOT EXISTS settings_draft jsonb NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS settings_published jsonb NOT NULL DEFAULT '{}'::jsonb;
