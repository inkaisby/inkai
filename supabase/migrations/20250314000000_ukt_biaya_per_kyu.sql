-- Biaya UKT per level Kyu/Dan (opsional per tahun ajaran).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ukt_tahun_ajaran' AND column_name = 'biaya_per_kyu'
  ) THEN
    ALTER TABLE public.ukt_tahun_ajaran ADD COLUMN biaya_per_kyu jsonb DEFAULT '{}';
    COMMENT ON COLUMN public.ukt_tahun_ajaran.biaya_per_kyu IS 'Tarif per Kyu/Dan, e.g. {"1":200000,"2":250000,"dan_1":300000}. Key: angka Kyu 1-10 atau dan_1, dan_2, ...';
  END IF;
END $$;
