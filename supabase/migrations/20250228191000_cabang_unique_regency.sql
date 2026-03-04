-- Satu cabang organisasi = satu kabupaten/kota (regency_id unik per provinsi)
-- Agar seed cabang dari wilayah tidak duplikat

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'cabang' AND column_name = 'regency_id') THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_cabang_provinsi_regency_unique
      ON public.cabang (provinsi_id, regency_id)
      WHERE regency_id IS NOT NULL;
  END IF;
END $$;
