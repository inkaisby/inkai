-- Fase 1: Hierarki organisasi INKAI
-- Provinsi (org) → Cabang (org) → Ranting (existing, + cabang_id)
-- Jalankan di Supabase: SQL Editor atau supabase db push

-- ============================================================
-- 1. Provinsi (organisasi level tertinggi per wilayah)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.provinsi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama text NOT NULL,
  aktif boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.provinsi IS 'Organisasi INKAI level provinsi (Pengprov)';

-- ============================================================
-- 2. Cabang (organisasi di bawah provinsi)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cabang (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama text NOT NULL,
  provinsi_id uuid NOT NULL REFERENCES public.provinsi(id) ON DELETE RESTRICT,
  aktif boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cabang_provinsi_id ON public.cabang(provinsi_id);
COMMENT ON TABLE public.cabang IS 'Organisasi INKAI level cabang; satu cabang punya banyak ranting';

-- ============================================================
-- 3. Ranting: tambah kolom cabang_id (FK ke cabang)
-- Asumsi: tabel ranting sudah ada dengan id, nama, aktif
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ranting' AND column_name = 'cabang_id'
  ) THEN
    ALTER TABLE public.ranting
    ADD COLUMN cabang_id uuid REFERENCES public.cabang(id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_ranting_cabang_id ON public.ranting(cabang_id);

-- ============================================================
-- 4. RLS (baca untuk authenticated)
-- ============================================================
ALTER TABLE public.provinsi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cabang ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "provinsi_select_authenticated" ON public.provinsi;
CREATE POLICY "provinsi_select_authenticated"
  ON public.provinsi FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "cabang_select_authenticated" ON public.cabang;
CREATE POLICY "cabang_select_authenticated"
  ON public.cabang FOR SELECT
  TO authenticated
  USING (true);

-- Grant
GRANT SELECT ON public.provinsi TO authenticated;
GRANT SELECT ON public.cabang TO authenticated;
