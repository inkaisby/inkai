-- Menu Ranting: kelola ranting (Tambah Ranting) untuk Cabang/Pengprov/PP.
-- required_structural_level 3 = minimal Ketua Cabang (level 3 ke atas).
INSERT INTO public.menus (key, name, icon, color, order_index, is_active, scope, superadmin_only, required_structural_level, required_functional_role, context_required)
VALUES ('ranting', 'Ranting', 'Building2', 'text-sky-400', 4, true, 'sidebar', false, 3, null, false)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  order_index = EXCLUDED.order_index,
  is_active = EXCLUDED.is_active,
  scope = EXCLUDED.scope,
  superadmin_only = EXCLUDED.superadmin_only,
  required_structural_level = EXCLUDED.required_structural_level,
  required_functional_role = EXCLUDED.required_functional_role,
  context_required = EXCLUDED.context_required;
