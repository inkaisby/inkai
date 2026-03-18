-- =============================================================================
-- Perbaiki error: "Database belum lengkap (kolom tabel) home_marketplace"
--
-- Cara pakai:
--   1. Buka Supabase Dashboard → SQL Editor → New query
--   2. Salin SEMUA isi file ini → Run
--
-- Aman dijalankan berulang (idempotent).
-- =============================================================================

-- Tabel dasar (jika proyek lama belum punya sama sekali)
CREATE TABLE IF NOT EXISTS public.home_marketplace (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  price text NOT NULL,
  image_path text,
  href text NOT NULL DEFAULT '/dashboard',
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_home_marketplace_order ON public.home_marketplace(order_index);

-- Kolom untuk Marketplace Saya + katalog
ALTER TABLE public.home_marketplace
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.home_marketplace
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.home_marketplace
  ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE public.home_marketplace
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_home_marketplace_created_by ON public.home_marketplace(created_by);
CREATE INDEX IF NOT EXISTS idx_home_marketplace_is_active ON public.home_marketplace(is_active);
CREATE INDEX IF NOT EXISTS idx_home_marketplace_category ON public.home_marketplace(category)
  WHERE category <> '';

COMMENT ON TABLE public.home_marketplace IS 'Marketplace Home: seragam, sabuk, perlengkapan dojo';
COMMENT ON COLUMN public.home_marketplace.description IS 'Deskripsi opsional produk (katalog)';
COMMENT ON COLUMN public.home_marketplace.category IS 'Kategori: Seragam, Sabuk, Perlengkapan, dll.';

-- Izin & RLS (selaras migrasi 20260317000000)
ALTER TABLE public.home_marketplace ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.home_marketplace TO authenticated;

DROP POLICY IF EXISTS "Allow read home_marketplace" ON public.home_marketplace;
DROP POLICY IF EXISTS "home_marketplace_select_active_or_own" ON public.home_marketplace;
CREATE POLICY "home_marketplace_select_active_or_own"
  ON public.home_marketplace
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    OR created_by = auth.uid()
    OR (SELECT COALESCE((SELECT app_role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1), '')::text) = 'SUPERADMIN'
  );

DROP POLICY IF EXISTS "home_marketplace_insert_own" ON public.home_marketplace;
CREATE POLICY "home_marketplace_insert_own"
  ON public.home_marketplace
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "home_marketplace_update_own_or_superadmin" ON public.home_marketplace;
CREATE POLICY "home_marketplace_update_own_or_superadmin"
  ON public.home_marketplace
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR (SELECT COALESCE((SELECT app_role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1), '')::text) = 'SUPERADMIN'
  )
  WITH CHECK (
    created_by = auth.uid()
    OR (SELECT COALESCE((SELECT app_role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1), '')::text) = 'SUPERADMIN'
  );

DROP POLICY IF EXISTS "home_marketplace_delete_own_or_superadmin" ON public.home_marketplace;
CREATE POLICY "home_marketplace_delete_own_or_superadmin"
  ON public.home_marketplace
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR (SELECT COALESCE((SELECT app_role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1), '')::text) = 'SUPERADMIN'
  );
