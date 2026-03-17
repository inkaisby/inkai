-- Komentar untuk home_feed (berita/event/dojo) di Dashboard Home.

CREATE TABLE IF NOT EXISTS public.home_feed_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_id uuid NOT NULL REFERENCES public.home_feed(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_home_feed_comments_feed_id_created_at
  ON public.home_feed_comments(feed_id, created_at);

COMMENT ON TABLE public.home_feed_comments IS 'Komentar untuk home_feed (Dashboard Home).';

ALTER TABLE public.home_feed_comments ENABLE ROW LEVEL SECURITY;

-- Baca: semua authenticated boleh melihat komentar selama bisa melihat feed terkait.
DROP POLICY IF EXISTS "home_feed_comments_select" ON public.home_feed_comments;
CREATE POLICY "home_feed_comments_select"
  ON public.home_feed_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.home_feed f
      WHERE f.id = feed_id
        AND (
          f.status = 'published'
          OR f.created_by = auth.uid()
          OR (SELECT COALESCE((SELECT app_role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1), '')::text) = 'SUPERADMIN'
        )
    )
  );

-- Insert: hanya pemilik komentar (user_id = auth.uid()).
DROP POLICY IF EXISTS "home_feed_comments_insert" ON public.home_feed_comments;
CREATE POLICY "home_feed_comments_insert"
  ON public.home_feed_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.home_feed f
      WHERE f.id = feed_id
        AND (
          f.status = 'published'
          OR f.created_by = auth.uid()
          OR (SELECT COALESCE((SELECT app_role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1), '')::text) = 'SUPERADMIN'
        )
    )
  );

-- Hapus: pemilik komentar atau SUPERADMIN.
DROP POLICY IF EXISTS "home_feed_comments_delete" ON public.home_feed_comments;
CREATE POLICY "home_feed_comments_delete"
  ON public.home_feed_comments
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (SELECT COALESCE((SELECT app_role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1), '')::text) = 'SUPERADMIN'
  );

GRANT SELECT, INSERT, DELETE ON public.home_feed_comments TO authenticated;

