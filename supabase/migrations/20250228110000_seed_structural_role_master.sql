-- Seed jabatan hirarki INKAI ke structural_role_master agar dropdown "Pilih jabatan" ada isinya.
-- Level: 1=Kohai, 2=Ranting, 3=Cabang, 4=Pengprov, 5=PP.
-- Aman dijalankan berulang (skip jika role_name sudah ada).

INSERT INTO public.structural_role_master (role_name, structural_level, organization_type)
SELECT v.role_name, v.structural_level, v.organization_type
FROM (VALUES
  ('KOHAl', 1, 'KARATE'),
  ('KETUA_RANTING', 2, 'KARATE'),
  ('SEKRETARIS_RANTING', 2, 'KARATE'),
  ('BENDAHARA_RANTING', 2, 'KARATE'),
  ('KETUA_CABANG', 3, 'KARATE'),
  ('SEKRETARIS_CABANG', 3, 'KARATE'),
  ('BENDAHARA_CABANG', 3, 'KARATE'),
  ('KETUA_PENGPROV', 4, 'KARATE'),
  ('SEKRETARIS_PENGPROV', 4, 'KARATE'),
  ('BENDAHARA_PENGPROV', 4, 'KARATE'),
  ('KESEHATAN_PROV', 4, 'KARATE'),
  ('KETUA_PP', 5, 'KARATE'),
  ('SEKRETARIS_PP', 5, 'KARATE'),
  ('BENDAHARA_PP', 5, 'KARATE')
) AS v(role_name, structural_level, organization_type)
WHERE NOT EXISTS (
  SELECT 1 FROM public.structural_role_master m WHERE m.role_name = v.role_name
);
