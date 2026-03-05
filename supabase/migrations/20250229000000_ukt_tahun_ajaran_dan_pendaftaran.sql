-- UKT (Ujian Kenaikan Tingkat): tahun ajaran + pendaftaran peserta per ranting.
-- Ketua ranting mendaftarkan anggota aktif; bendahara konfirmasi bayar.

-- ===============================
-- 1. Tahun ajaran UKT (mis. II/2026)
-- ===============================
CREATE TABLE IF NOT EXISTS public.ukt_tahun_ajaran (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama text NOT NULL,
  tahun integer NOT NULL,
  periode text NOT NULL DEFAULT 'I' CHECK (periode IN ('I', 'II')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ukt_tahun_ajaran_tahun ON public.ukt_tahun_ajaran(tahun);
CREATE INDEX IF NOT EXISTS idx_ukt_tahun_ajaran_is_active ON public.ukt_tahun_ajaran(is_active);

COMMENT ON TABLE public.ukt_tahun_ajaran IS 'Tahun ajaran UKT (e.g. II/2026)';

-- ===============================
-- 2. Pendaftaran UKT (satu baris = satu peserta per tahun ajaran)
-- ===============================
CREATE TABLE IF NOT EXISTS public.ukt_pendaftaran (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tahun_ajaran_id uuid NOT NULL REFERENCES public.ukt_tahun_ajaran(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ranting_id uuid NOT NULL REFERENCES public.ranting(id) ON DELETE CASCADE,
  kyu_dan_terakhir text,
  status_bayar text NOT NULL DEFAULT 'menunggu_bayar'
    CHECK (status_bayar IN ('menunggu_bayar', 'bukti_uploaded', 'lunas', 'batal')),
  total_bayar numeric(12,2),
  bukti_transfer_path text,
  dikonfirmasi_oleh uuid REFERENCES auth.users(id),
  dikonfirmasi_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tahun_ajaran_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_ukt_pendaftaran_tahun_ajaran ON public.ukt_pendaftaran(tahun_ajaran_id);
CREATE INDEX IF NOT EXISTS idx_ukt_pendaftaran_ranting ON public.ukt_pendaftaran(ranting_id);
CREATE INDEX IF NOT EXISTS idx_ukt_pendaftaran_profile ON public.ukt_pendaftaran(profile_id);
CREATE INDEX IF NOT EXISTS idx_ukt_pendaftaran_status ON public.ukt_pendaftaran(status_bayar);

COMMENT ON TABLE public.ukt_pendaftaran IS 'Peserta UKT per tahun ajaran; status bayar + konfirmasi bendahara';

-- RLS: API pakai admin client; policy untuk baca terbatas jika nanti dipakai client
ALTER TABLE public.ukt_tahun_ajaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ukt_pendaftaran ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read ukt_tahun_ajaran" ON public.ukt_tahun_ajaran;
CREATE POLICY "Allow read ukt_tahun_ajaran" ON public.ukt_tahun_ajaran FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow read ukt_pendaftaran" ON public.ukt_pendaftaran;
CREATE POLICY "Allow read ukt_pendaftaran" ON public.ukt_pendaftaran FOR SELECT TO authenticated USING (true);

-- Grant untuk service_role (admin client)
GRANT ALL ON public.ukt_tahun_ajaran TO service_role;
GRANT ALL ON public.ukt_pendaftaran TO service_role;
GRANT ALL ON public.ukt_tahun_ajaran TO authenticated;
GRANT ALL ON public.ukt_tahun_ajaran TO anon;
GRANT ALL ON public.ukt_pendaftaran TO authenticated;
GRANT ALL ON public.ukt_pendaftaran TO anon;

-- Seed satu tahun ajaran (II/2026) agar dropdown langsung terisi
INSERT INTO public.ukt_tahun_ajaran (nama, tahun, periode, is_active)
SELECT 'II / 2026', 2026, 'II', true
WHERE NOT EXISTS (SELECT 1 FROM public.ukt_tahun_ajaran LIMIT 1);
