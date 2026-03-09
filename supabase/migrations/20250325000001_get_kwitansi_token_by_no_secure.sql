-- RPC: Cari kwitansi berdasarkan no. kwitansi (UKT-xxxxxxxx) dengan verifikasi opsional.
-- - p_nominal NULL: cukup no kwitansi (fallback cepat)
-- - p_nominal terisi: harus match total_bayar (verifikasi tambahan, lebih aman untuk publik)

CREATE OR REPLACE FUNCTION public.get_kwitansi_token_by_no_secure(p_no text, p_nominal numeric DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix text;
  v_token text;
BEGIN
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
    AND (p_nominal IS NULL OR total_bayar = p_nominal)
  LIMIT 1;

  RETURN v_token;
END;
$$;

COMMENT ON FUNCTION public.get_kwitansi_token_by_no_secure(text, numeric) IS
  'Cari token kwitansi dari no. kwitansi (UKT-xxxxxxxx) dengan verifikasi nominal opsional.';

