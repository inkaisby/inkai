-- Debounce event insert: max 1 event per (user_id, type) dalam N detik
-- Cegah spam "Profil diperbarui" dari auto-save

CREATE OR REPLACE FUNCTION insert_event_debounced(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_interval_seconds int DEFAULT 60
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Skip jika user_id null
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO events (user_id, type, title, created_at)
  SELECT p_user_id, p_type, p_title, now()
  WHERE NOT EXISTS (
    SELECT 1 FROM events e
    WHERE e.user_id = p_user_id
      AND e.type = p_type
      AND e.created_at > now() - (p_interval_seconds || ' seconds')::interval
  );
END;
$$;

-- Contoh pemakaian di save_profile RPC (ganti insert langsung dengan):
-- PERFORM insert_event_debounced(p_user_id, 'profile.updated', 'Profil diperbarui', 60);
