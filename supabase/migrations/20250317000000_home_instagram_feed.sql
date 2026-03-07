-- Feed IG: unggahan Instagram (gambar, caption, link) untuk tampil di Home.
CREATE TABLE IF NOT EXISTS public.home_instagram_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  caption text,
  post_url text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_home_instagram_feed_order ON public.home_instagram_feed(order_index DESC);
COMMENT ON TABLE public.home_instagram_feed IS 'Feed IG: post Instagram (gambar, caption, link) untuk Home';

ALTER TABLE public.home_instagram_feed ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read home_instagram_feed" ON public.home_instagram_feed;
CREATE POLICY "Allow read home_instagram_feed" ON public.home_instagram_feed FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.home_instagram_feed TO authenticated;

-- Data awal feed IG (beserta gambar placeholder)
INSERT INTO public.home_instagram_feed (image_url, caption, post_url, order_index)
VALUES
  (
    'https://placehold.co/400x400/1e293b/f472b6?text=Latihan+Bersama',
    'Latihan rutin dojo. Semangat! 🥋',
    'https://instagram.com',
    10
  ),
  (
    'https://placehold.co/400x400/1e293b/a78bfa?text=Ujian+Kyu',
    'Ujian kyu periode ini. Selamat kepada yang lulus!',
    'https://instagram.com',
    9
  ),
  (
    'https://placehold.co/400x400/1e293b/34d399?text=Gashuku',
    'Gashuku nasional 2025. Daftar segera.',
    'https://instagram.com',
    8
  ),
  (
    'https://placehold.co/400x400/1e293b/fbbf24?text=Kejuaraan',
    'Kejuaraan daerah. Sampai jumpa di mat.',
    'https://instagram.com',
    7
  ),
  (
    'https://placehold.co/400x400/1e293b/38bdf8?text=Dojo+Baru',
    'Pembukaan dojo baru. Mari berlatih bersama.',
    'https://instagram.com',
    6
  );
