-- Ranting sesuai wilayah: filter dropdown ranting by province/regency/district user
-- Menambah kolom wilayah ke ranting agar ranting bisa difilter per kabupaten/kecamatan

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ranting' AND column_name = 'province_id'
  ) THEN
    ALTER TABLE public.ranting ADD COLUMN province_id integer;
  END IF;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ranting' AND column_name = 'regency_id'
  ) THEN
    ALTER TABLE public.ranting ADD COLUMN regency_id integer;
  END IF;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ranting' AND column_name = 'district_id'
  ) THEN
    ALTER TABLE public.ranting ADD COLUMN district_id integer;
  END IF;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_ranting_province_id ON public.ranting(province_id);
CREATE INDEX IF NOT EXISTS idx_ranting_regency_id ON public.ranting(regency_id);
CREATE INDEX IF NOT EXISTS idx_ranting_district_id ON public.ranting(district_id);
