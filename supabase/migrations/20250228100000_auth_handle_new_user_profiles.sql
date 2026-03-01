-- Trigger: saat user baru daftar (auth.users INSERT), buat baris di public.profiles.
-- Mengatasi error "Database error saving new user".

-- DEFAULT untuk kolom yang sering NOT NULL (supaya INSERT hanya id, user_id, email tetap sukses)
DO $$
DECLARE r record;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'nama') THEN
    ALTER TABLE public.profiles ALTER COLUMN nama SET DEFAULT '';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'app_role') THEN
    ALTER TABLE public.profiles ALTER COLUMN app_role SET DEFAULT 'USER';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email_allowed') THEN
    ALTER TABLE public.profiles ALTER COLUMN email_allowed SET DEFAULT true;
  END IF;
  -- Kolom teks lain yang sering NOT NULL (nik, telepon, dll.) → default '' agar insert minimal tidak gagal
  FOR r IN (SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name IN ('nik','telepon','jenis_kelamin','tanggal_lahir','nama_ayah','nama_ibu','pekerjaan_ortu','alamat'))
  LOOP
    BEGIN EXECUTE format('ALTER TABLE public.profiles ALTER COLUMN %I SET DEFAULT ''''', r.column_name); EXCEPTION WHEN OTHERS THEN NULL; END;
  END LOOP;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Hapus trigger lama jika ada
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user_trigger ON auth.users;

-- Jangan RAISE agar pendaftaran auth tetap sukses; profil bisa dibuat nanti lewat /api/me fallback
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := COALESCE(trim(new.email), '');
BEGIN
  INSERT INTO public.profiles (id, user_id, email)
  VALUES (gen_random_uuid(), new.id, v_email);
  RETURN new;
EXCEPTION
  WHEN unique_violation THEN
    RETURN new;
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user (signup tetap lanjut): %', SQLERRM;
    RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS
  'Membuat baris public.profiles saat sign up. Insert minimal (id, user_id, email) lalu UPDATE nama, app_role, email_allowed.';
