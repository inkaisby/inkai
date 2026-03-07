-- Hasil ujian UKT: setelah ujian, Cabang menandai lulus + tingkat baru.
-- Data ini otomatis tampil di menu Keanggotaan > tab Kyu (terintegrasi dengan No. Anggota).
ALTER TABLE public.ukt_pendaftaran
  ADD COLUMN IF NOT EXISTS lulus boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tingkat_lulus integer CHECK (tingkat_lulus IS NULL OR (tingkat_lulus >= 1 AND tingkat_lulus <= 10));

COMMENT ON COLUMN public.ukt_pendaftaran.lulus IS 'Peserta lulus ujian (diisi Cabang setelah ujian selesai)';
COMMENT ON COLUMN public.ukt_pendaftaran.tingkat_lulus IS 'Tingkat/Kyu baru setelah lulus (1-10); dipakai untuk isi otomatis tab Kyu di Keanggotaan';
