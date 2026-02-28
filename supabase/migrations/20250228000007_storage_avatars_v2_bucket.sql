-- Pastikan bucket avatars_v2 ada (untuk upload avatar profil via API).
-- Jika bucket sudah ada, no-op (ON CONFLICT DO NOTHING).

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars_v2', 'avatars_v2', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: authenticated user boleh upload ke folder sendiri (user_id/*)
DROP POLICY IF EXISTS "avatars_v2_insert_own" ON storage.objects;
CREATE POLICY "avatars_v2_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars_v2'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: public read (bucket public)
DROP POLICY IF EXISTS "avatars_v2_select_public" ON storage.objects;
CREATE POLICY "avatars_v2_select_public"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars_v2');

-- Policy: user boleh update/delete file di folder sendiri
DROP POLICY IF EXISTS "avatars_v2_update_own" ON storage.objects;
CREATE POLICY "avatars_v2_update_own"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars_v2'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars_v2'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "avatars_v2_delete_own" ON storage.objects;
CREATE POLICY "avatars_v2_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars_v2'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
