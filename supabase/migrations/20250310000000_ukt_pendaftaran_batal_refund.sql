-- Batal ikut UKT + pengembalian dana + history (audit via events).
-- Kolom tambahan di ukt_pendaftaran untuk batal dan refund.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ukt_pendaftaran' AND column_name = 'batal_at'
  ) THEN
    ALTER TABLE public.ukt_pendaftaran
      ADD COLUMN batal_at timestamptz,
      ADD COLUMN alasan_batal text,
      ADD COLUMN refund_jumlah numeric(12,2),
      ADD COLUMN refund_status text DEFAULT 'tidak_ada' CHECK (refund_status IN ('tidak_ada', 'pending', 'dikembalikan')),
      ADD COLUMN refund_at timestamptz,
      ADD COLUMN refund_catatan text;
    COMMENT ON COLUMN public.ukt_pendaftaran.batal_at IS 'Waktu peserta dibatalkan ikut UKT';
    COMMENT ON COLUMN public.ukt_pendaftaran.alasan_batal IS 'Alasan batal (opsional)';
    COMMENT ON COLUMN public.ukt_pendaftaran.refund_jumlah IS 'Nominal pengembalian dana (Rp)';
    COMMENT ON COLUMN public.ukt_pendaftaran.refund_status IS 'tidak_ada | pending | dikembalikan';
    COMMENT ON COLUMN public.ukt_pendaftaran.refund_at IS 'Waktu dana dikembalikan';
    COMMENT ON COLUMN public.ukt_pendaftaran.refund_catatan IS 'Catatan pengembalian (rekening, dll)';
  END IF;
END $$;
