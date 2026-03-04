-- Kolom file_path untuk menyimpan path file ijazah/sertifikat di Storage.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'kyu' AND column_name = 'file_path') THEN
    ALTER TABLE public.kyu ADD COLUMN file_path text;
    COMMENT ON COLUMN public.kyu.file_path IS 'Path file di bucket ijazah (Storage).';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'dan' AND column_name = 'file_path') THEN
    ALTER TABLE public.dan ADD COLUMN file_path text;
    COMMENT ON COLUMN public.dan.file_path IS 'Path file ijazah DAN di bucket ijazah.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pelatihan' AND column_name = 'file_path') THEN
    ALTER TABLE public.pelatihan ADD COLUMN file_path text;
    COMMENT ON COLUMN public.pelatihan.file_path IS 'Path sertifikat pelatihan di bucket ijazah.';
  END IF;
END $$;
