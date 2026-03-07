-- Home: feed (pengumuman/event/dojo) dan marketplace untuk Dashboard Home.
-- Baca oleh authenticated; kelola nanti bisa lewat menu admin.

-- ===============================
-- 1. Home Feed
-- ===============================
CREATE TABLE IF NOT EXISTS public.home_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  image_path text,
  type text NOT NULL CHECK (type IN ('event', 'pengumuman', 'dojo')),
  likes integer NOT NULL DEFAULT 0,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_home_feed_created_at ON public.home_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_home_feed_type ON public.home_feed(type);
COMMENT ON TABLE public.home_feed IS 'Feed Home: event, pengumuman, dojo (jadwal dll)';

ALTER TABLE public.home_feed ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read home_feed" ON public.home_feed;
CREATE POLICY "Allow read home_feed" ON public.home_feed FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.home_feed TO authenticated;

-- ===============================
-- 2. Home Marketplace
-- ===============================
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
COMMENT ON TABLE public.home_marketplace IS 'Marketplace Home: seragam, sabuk, perlengkapan dojo';

ALTER TABLE public.home_marketplace ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read home_marketplace" ON public.home_marketplace;
CREATE POLICY "Allow read home_marketplace" ON public.home_marketplace FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.home_marketplace TO authenticated;

-- ===============================
-- 3. Seed data (hanya jika kosong)
-- ===============================
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM public.home_feed) = 0 THEN
    INSERT INTO public.home_feed (title, body, type, likes, order_index)
    VALUES
      ('Gashuku Nasional 2025', 'Pendaftaran dibuka. Ayo daftar dan raih pengalaman berlatih bersama seluruh anggota INKAI.', 'event', 24, 10),
      ('Pengumuman Ujian Kyu', 'Ujian kyu periode Maret akan dilaksanakan di dojo masing-masing. Silakan koordinasi dengan pelatih.', 'pengumuman', 12, 9),
      ('Jadwal Latihan Pekan Ini', 'Senin–Jumat 16.00–18.00, Sabtu 08.00–10.00. Tetap semangat!', 'dojo', 8, 8);
  END IF;
END $$;

DO $$
BEGIN
  IF (SELECT COUNT(*) FROM public.home_marketplace) = 0 THEN
    INSERT INTO public.home_marketplace (title, price, href, order_index)
    VALUES
      ('Seragam INKAI', 'Rp 350.000', '/dashboard', 10),
      ('Sabuk Latihan', 'Rp 85.000', '/dashboard', 9),
      ('Buku Panduan Kyu', 'Rp 75.000', '/dashboard', 8),
      ('Tas Dojo', 'Rp 120.000', '/dashboard', 7);
  END IF;
END $$;
