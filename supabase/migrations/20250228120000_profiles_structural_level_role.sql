-- Kolom ringkasan level/jabatan di profiles (untuk tab Profil Settings).
-- Multi jabatan tetap di user_structural_roles; ini hanya legacy/singkat.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'structural_level'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN structural_level integer;
  END IF;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'structural_role'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN structural_role text;
  END IF;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

COMMENT ON COLUMN public.profiles.structural_level IS 'Level hirarki 1-5 (ringkasan); untuk multi jabatan pakai user_structural_roles.';
COMMENT ON COLUMN public.profiles.structural_role IS 'Nama jabatan ringkasan (teks); untuk multi jabatan pakai user_structural_roles.';
