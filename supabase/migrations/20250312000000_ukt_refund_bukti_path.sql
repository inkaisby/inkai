-- Bukti transfer pengembalian dana (cabang). Path disimpan di ukt_pendaftaran.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ukt_pendaftaran' AND column_name = 'refund_bukti_path'
  ) THEN
    ALTER TABLE public.ukt_pendaftaran
      ADD COLUMN refund_bukti_path text;
    COMMENT ON COLUMN public.ukt_pendaftaran.refund_bukti_path IS 'Path file bukti transfer pengembalian dana (bucket ijazah)';
  END IF;
END $$;
