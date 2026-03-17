-- Tambah kolom author_name jika belum ada (untuk tampilan nama di komentar).
-- JALANKAN MANUAL: Supabase Dashboard → SQL Editor → paste lalu Run.

ALTER TABLE public.home_feed_comments
  ADD COLUMN IF NOT EXISTS author_name text;

COMMENT ON COLUMN public.home_feed_comments.author_name IS 'Nama tampilan komentator (dari user_metadata/email saat POST).';
