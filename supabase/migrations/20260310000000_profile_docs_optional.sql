-- Optional profile documents: KTP, Akta Lahir, Kartu Keluarga
-- - Create private bucket `profile_docs`
-- - Add columns on `public.profiles` to store storage paths

-- 1) Columns (idempotent)
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS ktp_path text,
  ADD COLUMN IF NOT EXISTS akta_lahir_path text,
  ADD COLUMN IF NOT EXISTS kk_path text;

-- 2) Bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile_docs', 'profile_docs', false)
ON CONFLICT (id) DO NOTHING;

-- 3) Storage policies (authenticated users only, own folder)
-- Upload: authenticated only to their own folder (auth.uid()/{...})
DROP POLICY IF EXISTS "profile_docs_insert_own" ON storage.objects;
CREATE POLICY "profile_docs_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'profile_docs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Read: authenticated only for own folder
DROP POLICY IF EXISTS "profile_docs_select_own" ON storage.objects;
CREATE POLICY "profile_docs_select_own"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'profile_docs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Update/delete: authenticated only for own folder
DROP POLICY IF EXISTS "profile_docs_update_own" ON storage.objects;
CREATE POLICY "profile_docs_update_own"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'profile_docs'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'profile_docs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "profile_docs_delete_own" ON storage.objects;
CREATE POLICY "profile_docs_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'profile_docs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

