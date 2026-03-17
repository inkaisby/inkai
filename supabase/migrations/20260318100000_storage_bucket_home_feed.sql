-- =============================================================================
-- JALANKAN MANUAL: Supabase Dashboard → SQL Editor → New query → paste semua
--                  lalu Run. Membuat bucket home_feed + policy untuk upload
--                  gambar konten feed (berita/event/dojo).
-- =============================================================================
-- Bucket home_feed: gambar untuk konten feed (berita/event/dojo).
-- Path: {user_id}/feed/{timestamp}.{ext}

INSERT INTO storage.buckets (id, name, public)
VALUES ('home_feed', 'home_feed', true)
ON CONFLICT (id) DO NOTHING;

-- Insert: authenticated hanya ke folder sendiri (user_id/*)
DROP POLICY IF EXISTS "home_feed_insert_own" ON storage.objects;
CREATE POLICY "home_feed_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'home_feed'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Public read
DROP POLICY IF EXISTS "home_feed_select_public" ON storage.objects;
CREATE POLICY "home_feed_select_public"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'home_feed');

-- Update/delete: hanya folder sendiri
DROP POLICY IF EXISTS "home_feed_update_own" ON storage.objects;
CREATE POLICY "home_feed_update_own"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'home_feed'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'home_feed'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "home_feed_delete_own" ON storage.objects;
CREATE POLICY "home_feed_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'home_feed'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
