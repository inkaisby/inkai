-- Tambah context_id ke user_functional_roles jika belum ada (untuk akses kontekstual)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_functional_roles' AND column_name = 'context_id'
  ) THEN
    ALTER TABLE public.user_functional_roles ADD COLUMN context_id uuid;
  END IF;
END $$;
