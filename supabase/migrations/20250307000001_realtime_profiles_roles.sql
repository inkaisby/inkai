-- Realtime: profiles, user_structural_roles, user_functional_roles
-- Agar SettingsView bisa subscribe perubahan untuk refresh semua tab (Profil, Role, Resume).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_structural_roles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_structural_roles;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_functional_roles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_functional_roles;
  END IF;
END $$;
