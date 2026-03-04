-- Kolom untuk kartu keanggotaan: No. Anggota, Status, DAN (ringkasan di profil).
-- Jalankan di Supabase SQL Editor jika belum jalan via migration.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'nomor') THEN
    ALTER TABLE public.profiles ADD COLUMN nomor text;
    COMMENT ON COLUMN public.profiles.nomor IS 'Nomor anggota (No. Anggota) untuk kartu digital keanggotaan.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'status') THEN
    ALTER TABLE public.profiles ADD COLUMN status text;
    COMMENT ON COLUMN public.profiles.status IS 'Status keanggotaan: AKTIF / NONAKTIF.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'dan') THEN
    ALTER TABLE public.profiles ADD COLUMN dan integer;
    COMMENT ON COLUMN public.profiles.dan IS 'Tingkat DAN (ringkasan); detail di tabel dan.';
  END IF;
END $$;
