-- Tabel untuk riwayat KYU, DAN, dan Pelatihan (anggota).
-- Jalankan di Supabase: SQL Editor → New query → paste → Run.

-- ============================================================
-- 1. KYU (tingkat sabuk)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.kyu (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  level integer NOT NULL CHECK (level >= 1 AND level <= 10),
  no_ijazah text,
  tanggal_ijazah text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kyu_profile_id ON public.kyu(profile_id);

ALTER TABLE public.kyu ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User can manage own kyu" ON public.kyu;
CREATE POLICY "User can manage own kyu"
  ON public.kyu
  FOR ALL
  USING (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Supabase client pakai role anon/authenticated; tanpa GRANT = "permission denied"
GRANT ALL ON public.kyu TO anon;
GRANT ALL ON public.kyu TO authenticated;

-- ============================================================
-- 2. DAN
-- ============================================================
CREATE TABLE IF NOT EXISTS public.dan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dan integer NOT NULL CHECK (dan >= 1 AND dan <= 8),
  tanggal text,
  msh_number text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dan_profile_id ON public.dan(profile_id);

ALTER TABLE public.dan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User can manage own dan" ON public.dan;
CREATE POLICY "User can manage own dan"
  ON public.dan
  FOR ALL
  USING (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

GRANT ALL ON public.dan TO anon;
GRANT ALL ON public.dan TO authenticated;

-- ============================================================
-- 3. PELATIHAN / SERTIFIKASI
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pelatihan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nama text NOT NULL,
  tanggal text,
  kategori text DEFAULT 'PELATIHAN',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pelatihan_profile_id ON public.pelatihan(profile_id);

ALTER TABLE public.pelatihan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User can manage own pelatihan" ON public.pelatihan;
CREATE POLICY "User can manage own pelatihan"
  ON public.pelatihan
  FOR ALL
  USING (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

GRANT ALL ON public.pelatihan TO anon;
GRANT ALL ON public.pelatihan TO authenticated;
