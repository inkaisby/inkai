-- Tabel Prestasi (riwayat pertandingan/kejuaraan) per profil anggota.
-- Kategori: OPEN / FESTIVAL. Verifikasi oleh Ketua Ranting (verified_at, verified_by).

CREATE TABLE IF NOT EXISTS public.prestasi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kategori text NOT NULL CHECK (kategori IN ('OPEN', 'FESTIVAL')),
  nama_kejuaraan text NOT NULL,
  tahun text,
  tingkat text CHECK (tingkat IN ('Nasional', 'Provinsi', 'Kota')),
  kelas_pertandingan text,
  file_path text,
  verified_at timestamptz,
  verified_by uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prestasi_profile_id ON public.prestasi(profile_id);
CREATE INDEX IF NOT EXISTS idx_prestasi_verified_at ON public.prestasi(verified_at) WHERE verified_at IS NOT NULL;

COMMENT ON COLUMN public.prestasi.file_path IS 'Path file bukti di bucket ijazah (Storage).';
COMMENT ON COLUMN public.prestasi.verified_by IS 'user_id (auth.users) yang memverifikasi (Ketua Ranting).';

ALTER TABLE public.prestasi ENABLE ROW LEVEL SECURITY;

-- Pemilik profil boleh CRUD prestasi miliknya.
DROP POLICY IF EXISTS "User can manage own prestasi" ON public.prestasi;
CREATE POLICY "User can manage own prestasi"
  ON public.prestasi
  FOR ALL
  USING (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Baca sendiri (konsisten dengan kyu/dan/pelatihan).
DROP POLICY IF EXISTS "prestasi_read_own" ON public.prestasi;
CREATE POLICY "prestasi_read_own"
  ON public.prestasi
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = prestasi.profile_id
        AND p.user_id = auth.uid()
    )
  );

GRANT ALL ON public.prestasi TO anon;
GRANT ALL ON public.prestasi TO authenticated;
