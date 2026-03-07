-- Status bayar 'ditolak' (Cabang menolak bukti TF) + kolom alasan
ALTER TABLE public.ukt_pendaftaran
  DROP CONSTRAINT IF EXISTS ukt_pendaftaran_status_bayar_check;

ALTER TABLE public.ukt_pendaftaran
  ADD CONSTRAINT ukt_pendaftaran_status_bayar_check
  CHECK (status_bayar IN ('menunggu_bayar', 'bukti_uploaded', 'lunas', 'batal', 'ditolak'));

ALTER TABLE public.ukt_pendaftaran
  ADD COLUMN IF NOT EXISTS alasan_tolak_bukti text;

COMMENT ON COLUMN public.ukt_pendaftaran.alasan_tolak_bukti IS 'Alasan Cabang menolak bukti transfer (isi saat status_bayar = ditolak)';
