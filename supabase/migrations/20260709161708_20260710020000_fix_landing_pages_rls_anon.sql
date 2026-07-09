/*
# Fix landing_pages RLS to allow anon CRUD

The admin dashboard uses its own auth (not Supabase auth), so the
Supabase client runs as anon role. All policies must include anon.
*/

DROP POLICY IF EXISTS "auth_insert_landing_pages" ON landing_pages;
CREATE POLICY "auth_insert_landing_pages" ON landing_pages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_landing_pages" ON landing_pages;
CREATE POLICY "auth_update_landing_pages" ON landing_pages FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_landing_pages" ON landing_pages;
CREATE POLICY "auth_delete_landing_pages" ON landing_pages FOR DELETE
  TO anon, authenticated USING (true);

NOTIFY pgrst, 'reload schema';
