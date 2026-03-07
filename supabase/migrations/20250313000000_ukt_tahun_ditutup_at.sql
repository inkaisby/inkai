-- Tahun ajaran UKT bisa ditutup oleh cabang/PP; setelah ditutup tidak bisa daftar/daftar ulang.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ukt_tahun_ajaran' AND column_name = 'ditutup_at'
  ) THEN
    ALTER TABLE public.ukt_tahun_ajaran ADD COLUMN ditutup_at timestamptz;
    COMMENT ON COLUMN public.ukt_tahun_ajaran.ditutup_at IS 'Waktu tahun ajaran ditutup; setelah ini tidak bisa daftar/daftar ulang (cabang/PP yang menutup)';
  END IF;
END $$;
