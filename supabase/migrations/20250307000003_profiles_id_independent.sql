-- Hapus FK profiles.id -> auth.users agar profil anggota (tanpa akun) bisa punya id UUID acak.
-- profiles.user_id tetap mereferensi auth.users; trigger signup tetap pakai gen_random_uuid() untuk id.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_id_fkey' AND table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;
  END IF;
END $$;
