/*
# Add missing columns to landing_pages table

Adds columns that the useLandingPage hook expects:
- sections_draft / sections_published (jsonb array for page sections)
- theme_draft / theme_published (jsonb for color/font theme)
- updated_at auto-update trigger
*/

ALTER TABLE landing_pages
  ADD COLUMN IF NOT EXISTS sections_draft jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS sections_published jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS theme_draft jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS theme_published jsonb NOT NULL DEFAULT '{}';

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_landing_pages_updated_at ON landing_pages;
CREATE TRIGGER set_landing_pages_updated_at
  BEFORE UPDATE ON landing_pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
