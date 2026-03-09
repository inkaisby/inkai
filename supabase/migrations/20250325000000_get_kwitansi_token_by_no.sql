-- RPC: Cari kwitansi berdasarkan no. kwitansi (UKT-xxxxxxxx).
-- PostgREST tidak mendukung ilike pada kolom UUID; pakai fungsi ini untuk id::text ilike.
-- Dipanggil dari /api/kwitansi/by-number.

CREATE OR REPLACE FUNCTION public.get_kwitansi_token_by_no(p_no text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix text;
  v_token text;
BEGIN
  -- Normalisasi: UKT-A23F0323 -> a23f0323, atau A23F0323 -> a23f0323
  v_prefix := lower(trim(regexp_replace(coalesce(p_no, ''), '^UKT-', '', 'i')));
  IF length(v_prefix) < 4 THEN
    RETURN NULL;
  END IF;
  v_prefix := left(v_prefix, 8) || '%';

  SELECT kwitansi_token INTO v_token
  FROM public.ukt_pendaftaran
  WHERE status_bayar = 'lunas'
    AND kwitansi_token IS NOT NULL
    AND id::text ILIKE v_prefix
  LIMIT 1;

  RETURN v_token;
END;
$$;

COMMENT ON FUNCTION public.get_kwitansi_token_by_no(text) IS 'Cari token kwitansi dari no. kwitansi (UKT-xxxxxxxx). Untuk API by-number.';
