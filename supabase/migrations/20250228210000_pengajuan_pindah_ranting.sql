-- Tabel pengajuan pindah ranting (anggota).
-- Riwayat pengajuan per user; status: DIAJUKAN / DISETUJUI / DITOLAK.

CREATE TABLE IF NOT EXISTS public.pengajuan_pindah_ranting (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  asal text NOT NULL,
  tujuan text NOT NULL,
  alasan text,
  status text NOT NULL DEFAULT 'DIAJUKAN' CHECK (status IN ('DIAJUKAN', 'DISETUJUI', 'DITOLAK')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pengajuan_pindah_ranting_profile_id ON public.pengajuan_pindah_ranting(profile_id);

ALTER TABLE public.pengajuan_pindah_ranting ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User can manage own pengajuan pindah ranting" ON public.pengajuan_pindah_ranting;
CREATE POLICY "User can manage own pengajuan pindah ranting"
  ON public.pengajuan_pindah_ranting
  FOR ALL
  USING (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

GRANT ALL ON public.pengajuan_pindah_ranting TO anon;
GRANT ALL ON public.pengajuan_pindah_ranting TO authenticated;
