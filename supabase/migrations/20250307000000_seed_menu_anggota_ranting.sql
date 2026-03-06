-- Menu Anggota Ranting: level 2–5 (Ketua Ranting, Cabang, Pengprov, PP). Satu user bisa punya beberapa ranting.
INSERT INTO public.menus (key, name, icon, color, order_index, is_active, scope, superadmin_only, required_structural_level, required_functional_role, context_required)
VALUES ('anggota-ranting', 'Anggota Ranting', 'Users', 'text-emerald-400', 6, true, 'sidebar', false, 2, null, false)
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
