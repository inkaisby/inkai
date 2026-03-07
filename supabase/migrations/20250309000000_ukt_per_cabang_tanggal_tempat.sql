-- UKT dinamis per cabang: cabang menentukan tanggal & tempat.
-- Tambah cabang_id, tanggal, tempat ke ukt_tahun_ajaran (nullable agar data lama tetap valid).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ukt_tahun_ajaran' AND column_name = 'cabang_id') THEN
    ALTER TABLE public.ukt_tahun_ajaran ADD COLUMN cabang_id uuid REFERENCES public.cabang(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ukt_tahun_ajaran' AND column_name = 'tanggal') THEN
    ALTER TABLE public.ukt_tahun_ajaran ADD COLUMN tanggal date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ukt_tahun_ajaran' AND column_name = 'tempat') THEN
    ALTER TABLE public.ukt_tahun_ajaran ADD COLUMN tempat text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ukt_tahun_ajaran_cabang_id ON public.ukt_tahun_ajaran(cabang_id);
COMMENT ON COLUMN public.ukt_tahun_ajaran.cabang_id IS 'Cabang yang mengadakan UKT; null = global (semua cabang)';
COMMENT ON COLUMN public.ukt_tahun_ajaran.tanggal IS 'Tanggal pelaksanaan UKT (ditentukan cabang)';
COMMENT ON COLUMN public.ukt_tahun_ajaran.tempat IS 'Tempat/lokasi UKT (ditentukan cabang)';
