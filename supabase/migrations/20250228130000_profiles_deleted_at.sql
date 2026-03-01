-- Soft delete: pengguna yang "dihapus" tidak muncul di daftar, tapi data tetap di DB.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- updated_at dipakai API DELETE; tambah jika belum ada (mis. tabel dari dashboard).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'updated_at') THEN
    ALTER TABLE public.profiles ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.deleted_at IS 'Diisi saat akun di-soft-delete dari Settings; GET /api/users memfilter deleted_at IS NULL.';
