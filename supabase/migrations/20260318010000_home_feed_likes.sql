-- Like per user untuk home_feed (supaya satu user tidak bisa menambah like berkali-kali).

CREATE TABLE IF NOT EXISTS public.home_feed_likes (
  feed_id uuid NOT NULL REFERENCES public.home_feed(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (feed_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_home_feed_likes_user_id
  ON public.home_feed_likes(user_id);

COMMENT ON TABLE public.home_feed_likes IS 'Like per user untuk tabel home_feed.';

ALTER TABLE public.home_feed_likes ENABLE ROW LEVEL SECURITY;

-- Baca: pemilik like sendiri atau SUPERADMIN (opsional, tidak dipakai di UI saat ini).
DROP POLICY IF EXISTS "home_feed_likes_select_own" ON public.home_feed_likes;
CREATE POLICY "home_feed_likes_select_own"
  ON public.home_feed_likes
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (SELECT COALESCE((SELECT app_role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1), '')::text) = 'SUPERADMIN'
  );

-- Insert: hanya user itu sendiri.
DROP POLICY IF EXISTS "home_feed_likes_insert_own" ON public.home_feed_likes;
CREATE POLICY "home_feed_likes_insert_own"
  ON public.home_feed_likes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Delete: pemilik like sendiri atau SUPERADMIN (kalau nanti dibutuhkan).
DROP POLICY IF EXISTS "home_feed_likes_delete_own" ON public.home_feed_likes;
CREATE POLICY "home_feed_likes_delete_own"
  ON public.home_feed_likes
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (SELECT COALESCE((SELECT app_role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1), '')::text) = 'SUPERADMIN'
  );

GRANT SELECT, INSERT, DELETE ON public.home_feed_likes TO authenticated;

