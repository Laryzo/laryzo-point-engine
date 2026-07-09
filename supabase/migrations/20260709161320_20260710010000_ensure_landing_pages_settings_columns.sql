/*
# Ensure settings columns exist on landing_pages

Idempotent: adds settings_draft and settings_published if not already present.
Also refreshes PostgREST schema cache.
*/

ALTER TABLE landing_pages
  ADD COLUMN IF NOT EXISTS settings_draft jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS settings_published jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sections_draft jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS sections_published jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS theme_draft jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS theme_published jsonb NOT NULL DEFAULT '{}';

-- Ensure default multibeauty row exists
INSERT INTO landing_pages (slug, title)
VALUES ('multibeauty', 'Multibeauty Soap')
ON CONFLICT (slug) DO NOTHING;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
