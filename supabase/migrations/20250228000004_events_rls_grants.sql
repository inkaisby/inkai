-- Fix: permission denied for table events (403, error 42501)
-- Grant SELECT + UPDATE untuk authenticated (client dengan JWT)
-- Juga anon (beberapa client pakai anon key + JWT di header)
-- RLS policy: user hanya baca/update event milik sendiri

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, UPDATE ON public.events TO authenticated;
GRANT SELECT, UPDATE ON public.events TO anon;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can read own events" ON public.events;
DROP POLICY IF EXISTS "users_can_read_own_events" ON public.events;
DROP POLICY IF EXISTS "events_select_own" ON public.events;
CREATE POLICY "events_select_own" ON public.events
  FOR SELECT
  TO public
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "events_update_own" ON public.events;
CREATE POLICY "events_update_own" ON public.events
  FOR UPDATE
  TO public
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
