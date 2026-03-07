-- Cabang menerbitkan QRIS untuk bayar/transfer; kwitansi dengan QR Code (scan & print ala bioskop).

-- 1. QRIS per tahun ajaran UKT (Cabang isi; Ranting scan untuk bayar)
ALTER TABLE public.ukt_tahun_ajaran
  ADD COLUMN IF NOT EXISTS qris_content text;

COMMENT ON COLUMN public.ukt_tahun_ajaran.qris_content IS 'Payload/URL QRIS untuk pembayaran UKT (diisi Cabang); Ranting scan untuk bayar atau transfer';

-- 2. Token unik kwitansi (untuk QR Code di kwitansi; Ketua Ranting scan → buka halaman → cetak)
ALTER TABLE public.ukt_pendaftaran
  ADD COLUMN IF NOT EXISTS kwitansi_token uuid UNIQUE DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS idx_ukt_pendaftaran_kwitansi_token ON public.ukt_pendaftaran(kwitansi_token) WHERE kwitansi_token IS NOT NULL;

COMMENT ON COLUMN public.ukt_pendaftaran.kwitansi_token IS 'Token untuk QR Code di kwitansi; scan → buka halaman verifikasi/cetak ulang';
