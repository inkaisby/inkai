-- Tambah DEFAULT untuk kolom profiles yang mungkin NOT NULL (agar trigger handle_new_user tidak gagal)
DO $$
DECLARE r record;
BEGIN
  FOR r IN (
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
    AND column_name IN ('nik','telepon','jenis_kelamin','tanggal_lahir','nama_ayah','nama_ibu','pekerjaan_ortu','alamat')
  ) LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.profiles ALTER COLUMN %I SET DEFAULT ''''', r.column_name);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $$;
