-- Pastikan menu Pertandingan (key=event) ada di sidebar untuk user biasa.
-- Constraint unik pada key; pakai ON CONFLICT agar aman jika baris event sudah ada.
INSERT INTO public.menus (key, name, icon, color, order_index, is_active, scope, superadmin_only, required_structural_level, required_functional_role, context_required)
VALUES ('event', 'Pertandingan', 'ScrollText', 'text-purple-400', 3, true, 'sidebar', false, null, null, false)
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
