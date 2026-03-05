-- Log aktivitas user untuk audit (Settings → Log Aktivitas).
-- Dibaca lewat API oleh Superadmin; insert dari server (helper logActivity).

CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text,
  action text NOT NULL,
  module text,
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_activity_logs_email ON public.user_activity_logs(email);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON public.user_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON public.user_activity_logs(user_id);

COMMENT ON TABLE public.user_activity_logs IS 'Audit log per user: aksi, modul, detail. Dibaca di Settings → Log Aktivitas.';

ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Authenticated: baca baris milik sendiri (user_id = auth.uid()) atau Superadmin baca semua (untuk Realtime).
DROP POLICY IF EXISTS "admin can read logs" ON public.user_activity_logs;
DROP POLICY IF EXISTS "user read own logs" ON public.user_activity_logs;
CREATE POLICY "user read own logs"
  ON public.user_activity_logs
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR (SELECT COALESCE((SELECT app_role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1), '')::text) = 'SUPERADMIN'
  );

-- Realtime: supaya panel Log Aktivitas bisa subscribe INSERT untuk email tertentu.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_activity_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_activity_logs;
  END IF;
END $$;
