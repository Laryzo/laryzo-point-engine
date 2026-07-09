/*
# Create landing_pages table

1. New Tables
- `landing_pages`
  - `id` (uuid, primary key)
  - `slug` (text, unique) — identifies the landing page, e.g. "multibeauty"
  - `title` (text) — display title
  - `settings_draft` (jsonb) — draft settings including chatbot, theme, order config
  - `settings_published` (jsonb) — published/live settings
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

2. Security
- Enable RLS on `landing_pages`.
- Allow anon + authenticated full CRUD (admin dashboard uses authenticated session, but allow anon read for the public landing page renderer).
- INSERT/UPDATE/DELETE restricted to authenticated only.
*/

CREATE TABLE IF NOT EXISTS landing_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL DEFAULT '',
  settings_draft jsonb NOT NULL DEFAULT '{}',
  settings_published jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_landing_pages" ON landing_pages;
CREATE POLICY "anon_select_landing_pages" ON landing_pages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_landing_pages" ON landing_pages;
CREATE POLICY "auth_insert_landing_pages" ON landing_pages FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_landing_pages" ON landing_pages;
CREATE POLICY "auth_update_landing_pages" ON landing_pages FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_landing_pages" ON landing_pages;
CREATE POLICY "auth_delete_landing_pages" ON landing_pages FOR DELETE
  TO authenticated USING (true);

-- Insert default multibeauty row if not exists
INSERT INTO landing_pages (slug, title, settings_draft, settings_published)
VALUES ('multibeauty', 'Multibeauty Soap', '{}', '{}')
ON CONFLICT (slug) DO NOTHING;
