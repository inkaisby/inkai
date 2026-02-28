-- Ranting wilayah: mapping provinsi/cabang ke BPS + propagate ke ranting
-- OPSIONAL: Hanya jika tabel provinsi/cabang ada (dari 20250228000000).
-- Jika tidak ada, isi ranting langsung (lihat docs/RANTING-WILAYAH-POPULATE.md).

-- ============================================================
-- 1. Kolom mapping wilayah di provinsi (org) dan cabang
--    Hanya dijalankan jika tabel ada
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'provinsi')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'provinsi' AND column_name = 'province_id') THEN
    ALTER TABLE public.provinsi ADD COLUMN province_id integer;
    COMMENT ON COLUMN public.provinsi.province_id IS 'ID BPS provinsi (wilayah) untuk filter ranting';
  END IF;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cabang')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cabang' AND column_name = 'regency_id') THEN
    ALTER TABLE public.cabang ADD COLUMN regency_id integer;
    COMMENT ON COLUMN public.cabang.regency_id IS 'ID BPS kabupaten/kota untuk filter ranting';
  END IF;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cabang')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cabang' AND column_name = 'district_id') THEN
    ALTER TABLE public.cabang ADD COLUMN district_id integer;
    COMMENT ON COLUMN public.cabang.district_id IS 'ID BPS kecamatan untuk filter ranting';
  END IF;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Index hanya jika tabel ada
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'provinsi') THEN
    CREATE INDEX IF NOT EXISTS idx_provinsi_province_id ON public.provinsi(province_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cabang') THEN
    CREATE INDEX IF NOT EXISTS idx_cabang_regency_id ON public.cabang(regency_id);
    CREATE INDEX IF NOT EXISTS idx_cabang_district_id ON public.cabang(district_id);
  END IF;
END $$;

-- ============================================================
-- 2. Fungsi populate ranting dari cabang/provinsi
-- ============================================================

CREATE OR REPLACE FUNCTION public.populate_ranting_wilayah()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  -- Hanya jalankan jika provinsi dan cabang ada
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'provinsi')
     OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cabang') THEN
    RETURN 0;
  END IF;

  -- Propagate province_id, regency_id, district_id dari cabang/provinsi ke ranting
  WITH updated AS (
    UPDATE public.ranting r
    SET
      province_id = p.province_id,
      regency_id = COALESCE(c.regency_id, r.regency_id),
      district_id = COALESCE(c.district_id, r.district_id)
    FROM public.cabang c
    LEFT JOIN public.provinsi p ON p.id = c.provinsi_id
    WHERE r.cabang_id = c.id
      AND p.province_id IS NOT NULL
    RETURNING r.id
  )
  SELECT count(*) INTO v_count FROM updated;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.populate_ranting_wilayah() IS
  'Isi province_id/regency_id/district_id ranting dari cabang/provinsi. Jalankan setelah isi provinsi.province_id dan cabang.regency_id/district_id.';
