-- Izinkan profil anggota tanpa akun login: user_id boleh NULL.
-- Dipakai saat tambah anggota ranting (satuan/massal) yang belum punya user_id.

ALTER TABLE public.profiles
  ALTER COLUMN user_id DROP NOT NULL;

COMMENT ON COLUMN public.profiles.user_id IS 'auth.users.id; NULL = profil anggota saja (belum punya akun login).';
