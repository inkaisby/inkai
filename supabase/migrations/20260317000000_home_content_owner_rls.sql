-- Home content: ownership + publish status + RLS
-- Goal:
-- - All authenticated users can CREATE
-- - Only owner can UPDATE/DELETE
-- - Other users can only SEE published/active content
-- - SUPERADMIN can manage all rows

-- Helper expression (inline in policies):
--   (SELECT COALESCE((SELECT app_role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1), '')::text) = 'SUPERADMIN'

-- ===============================
-- 1) home_feed (berita/pengumuman/event/dojo)
-- ===============================
ALTER TABLE public.home_feed
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published'));

CREATE INDEX IF NOT EXISTS idx_home_feed_created_by ON public.home_feed(created_by);
CREATE INDEX IF NOT EXISTS idx_home_feed_status ON public.home_feed(status);

ALTER TABLE public.home_feed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read home_feed" ON public.home_feed;
DROP POLICY IF EXISTS "home_feed_select_published_or_own" ON public.home_feed;
CREATE POLICY "home_feed_select_published_or_own"
  ON public.home_feed
  FOR SELECT
  TO authenticated
  USING (
    status = 'published'
    OR created_by = auth.uid()
    OR (SELECT COALESCE((SELECT app_role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1), '')::text) = 'SUPERADMIN'
  );

DROP POLICY IF EXISTS "home_feed_insert_own" ON public.home_feed;
CREATE POLICY "home_feed_insert_own"
  ON public.home_feed
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
  );

DROP POLICY IF EXISTS "home_feed_update_own_or_superadmin" ON public.home_feed;
CREATE POLICY "home_feed_update_own_or_superadmin"
  ON public.home_feed
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

DROP POLICY IF EXISTS "home_feed_delete_own_or_superadmin" ON public.home_feed;
CREATE POLICY "home_feed_delete_own_or_superadmin"
  ON public.home_feed
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR (SELECT COALESCE((SELECT app_role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1), '')::text) = 'SUPERADMIN'
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.home_feed TO authenticated;

-- ===============================
-- 2) home_instagram_feed (feed IG untuk Home)
-- ===============================
ALTER TABLE public.home_instagram_feed
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published'));

CREATE INDEX IF NOT EXISTS idx_home_instagram_feed_created_by ON public.home_instagram_feed(created_by);
CREATE INDEX IF NOT EXISTS idx_home_instagram_feed_status ON public.home_instagram_feed(status);

ALTER TABLE public.home_instagram_feed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read home_instagram_feed" ON public.home_instagram_feed;
DROP POLICY IF EXISTS "home_instagram_feed_select_published_or_own" ON public.home_instagram_feed;
CREATE POLICY "home_instagram_feed_select_published_or_own"
  ON public.home_instagram_feed
  FOR SELECT
  TO authenticated
  USING (
    status = 'published'
    OR created_by = auth.uid()
    OR (SELECT COALESCE((SELECT app_role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1), '')::text) = 'SUPERADMIN'
  );

DROP POLICY IF EXISTS "home_instagram_feed_insert_own" ON public.home_instagram_feed;
CREATE POLICY "home_instagram_feed_insert_own"
  ON public.home_instagram_feed
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
  );

DROP POLICY IF EXISTS "home_instagram_feed_update_own_or_superadmin" ON public.home_instagram_feed;
CREATE POLICY "home_instagram_feed_update_own_or_superadmin"
  ON public.home_instagram_feed
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

DROP POLICY IF EXISTS "home_instagram_feed_delete_own_or_superadmin" ON public.home_instagram_feed;
CREATE POLICY "home_instagram_feed_delete_own_or_superadmin"
  ON public.home_instagram_feed
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR (SELECT COALESCE((SELECT app_role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1), '')::text) = 'SUPERADMIN'
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.home_instagram_feed TO authenticated;

-- ===============================
-- 3) home_marketplace (produk/tautan untuk Home)
-- ===============================
ALTER TABLE public.home_marketplace
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_home_marketplace_created_by ON public.home_marketplace(created_by);
CREATE INDEX IF NOT EXISTS idx_home_marketplace_is_active ON public.home_marketplace(is_active);

ALTER TABLE public.home_marketplace ENABLE ROW LEVEL SECURITY;

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
  WITH CHECK (
    created_by = auth.uid()
  );

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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.home_marketplace TO authenticated;

