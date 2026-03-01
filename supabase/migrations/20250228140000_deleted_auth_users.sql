-- User yang dihapus dari Settings tapi tidak punya baris di profiles (auth-only):
-- dicatat di sini agar GET /api/users tidak menampilkan lagi setelah refresh.
CREATE TABLE IF NOT EXISTS public.deleted_auth_users (
  user_id uuid PRIMARY KEY,
  deleted_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.deleted_auth_users IS 'Auth user_id yang di-soft-delete dari Settings saat profil tidak ditemukan; GET /api/users memfilter daftar berdasarkan tabel ini + profiles.deleted_at.';
