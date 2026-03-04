-- Bucket ijazah: file ijazah KYU/DAN dan sertifikat pelatihan.
-- Path: {user_id}/kyu/{id}.pdf, {user_id}/dan/{id}.pdf, {user_id}/pelatihan/{id}.pdf

INSERT INTO storage.buckets (id, name, public)
VALUES ('ijazah', 'ijazah', true)
ON CONFLICT (id) DO NOTHING;

-- Upload: authenticated hanya ke folder sendiri (user_id/*)
DROP POLICY IF EXISTS "ijazah_insert_own" ON storage.objects;
CREATE POLICY "ijazah_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'ijazah'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Public read (bucket public)
DROP POLICY IF EXISTS "ijazah_select_public" ON storage.objects;
CREATE POLICY "ijazah_select_public"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'ijazah');

-- Update/delete: hanya folder sendiri
DROP POLICY IF EXISTS "ijazah_update_own" ON storage.objects;
CREATE POLICY "ijazah_update_own"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'ijazah'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'ijazah'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "ijazah_delete_own" ON storage.objects;
CREATE POLICY "ijazah_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'ijazah'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
