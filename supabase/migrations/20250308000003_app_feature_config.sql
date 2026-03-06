-- Tabel konfigurasi fitur (kontrol terpusat untuk aturan RBAC fitur-level)
CREATE TABLE IF NOT EXISTS public.app_feature_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now()
);

-- Seed nilai default (aturan saran pamungkas)
INSERT INTO public.app_feature_config (key, value, description)
VALUES
  ('homebase.min_level_create_ranting', '3', 'Level minimal untuk tambah ranting (3 = Ketua Cabang ke atas)'),
  ('homebase.min_level_delete_ranting', '3', 'Level minimal untuk hapus ranting'),
  ('homebase.roles_keanggotaan_block', 'SEKRETARIS', 'Role yang boleh lihat blok Keanggotaan (selain structural 2+). Pisah koma untuk banyak.'),
  ('homebase.roles_event_block', 'PELATIH,SEKRETARIS', 'Role yang boleh lihat blok Event (selain structural 2+). Pisah koma untuk banyak.'),
  ('homebase.roles_kwitansi_block', 'BENDAHARA', 'Role yang boleh lihat blok Kwitansi (selain structural 2+). Pisah koma untuk banyak.')
ON CONFLICT (key) DO NOTHING;

-- Grant untuk service_role (admin client)
GRANT ALL ON public.app_feature_config TO service_role;
