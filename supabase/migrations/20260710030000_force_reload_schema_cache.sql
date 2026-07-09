-- Force reload schema cache to fix missing 'settings_draft' column error
22	-- This error usually happens when the column is added but PostgREST cache is stale
23	
24	ALTER TABLE IF EXISTS public.landing_pages 
25	ADD COLUMN IF NOT EXISTS settings_draft jsonb NOT NULL DEFAULT '{}'::jsonb,
26	ADD COLUMN IF NOT EXISTS settings_published jsonb NOT NULL DEFAULT '{}'::jsonb;
27	
28	-- Explicitly notify PostgREST to reload the schema
29	NOTIFY pgrst, 'reload schema';
30	
