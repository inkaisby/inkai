-- Realtime: ukt_pendaftaran
-- Agar Laporan UKT (ranting/cabang) ter-update saat ada perubahan dari pihak lain (daftar, batal, refund).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'ukt_pendaftaran'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ukt_pendaftaran;
  END IF;
END $$;
