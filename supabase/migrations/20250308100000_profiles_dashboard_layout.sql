-- Kolom untuk menyimpan urutan/layout dashboard (drag-and-drop) per user.
-- Isi: { "kpiOrder": ["ranting", "anggota", "ujian", "event", "kwitansi"], "sectionOrder": [...] }

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'dashboard_layout'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN dashboard_layout jsonb DEFAULT NULL;
  END IF;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

COMMENT ON COLUMN public.profiles.dashboard_layout IS 'Layout dashboard (urutan KPI, section) dari drag-and-drop; hanya untuk user yang login (user_id not null).';
