-- Bypass permission denied: pakai RPC SECURITY DEFINER (jalan sebagai owner)
-- Client panggil RPC, bukan query tabel events langsung

CREATE OR REPLACE FUNCTION public.get_my_events_count()
RETURNS int
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::int FROM public.events
  WHERE user_id = auth.uid() AND read_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.get_my_events(p_limit int DEFAULT 20)
RETURNS TABLE (
  id uuid,
  type text,
  title text,
  created_at timestamptz,
  read_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id, e.type, e.title, e.created_at, e.read_at
  FROM public.events e
  WHERE e.user_id = auth.uid()
  ORDER BY e.created_at DESC
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION public.mark_my_events_read()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.events
  SET read_at = now()
  WHERE user_id = auth.uid() AND read_at IS NULL;
$$;

-- Grant execute
GRANT EXECUTE ON FUNCTION public.get_my_events_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_events_count() TO anon;
GRANT EXECUTE ON FUNCTION public.get_my_events(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_events(int) TO anon;
GRANT EXECUTE ON FUNCTION public.mark_my_events_read() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_my_events_read() TO anon;
