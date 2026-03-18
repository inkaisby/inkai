-- Toolbar notifikasi: realtime pada tabel events + RPC get_my_events mengembalikan link.

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS link text;

-- Return type berubah (kolom link) → harus DROP dulu, bukan CREATE OR REPLACE.
DROP FUNCTION IF EXISTS public.get_my_events(integer);

CREATE FUNCTION public.get_my_events(p_limit int DEFAULT 20)
RETURNS TABLE (
  id uuid,
  type text,
  title text,
  created_at timestamptz,
  read_at timestamptz,
  link text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id, e.type, e.title, e.created_at, e.read_at, e.link
  FROM public.events e
  WHERE e.user_id = auth.uid()
  ORDER BY e.created_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_events(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_events(int) TO anon;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
  END IF;
END $$;
