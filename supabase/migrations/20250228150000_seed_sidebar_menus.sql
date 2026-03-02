-- Seed menu sidebar: Dashboard, Keanggotaan, Ujian, Event (untuk user biasa).
-- Insert hanya jika key belum ada. Tabel menus harus sudah ada.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.menus WHERE key = 'dashboard' AND scope = 'sidebar') THEN
    INSERT INTO public.menus (key, name, icon, color, order_index, is_active, scope, superadmin_only, required_structural_level, required_functional_role, context_required)
    VALUES ('dashboard', 'Dashboard', 'LayoutDashboard', 'text-cyan-400', 0, true, 'sidebar', false, null, null, false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.menus WHERE key = 'keanggotaan' AND scope = 'sidebar') THEN
    INSERT INTO public.menus (key, name, icon, color, order_index, is_active, scope, superadmin_only, required_structural_level, required_functional_role, context_required)
    VALUES ('keanggotaan', 'Keanggotaan', 'IdCard', 'text-indigo-400', 1, true, 'sidebar', false, null, null, false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.menus WHERE key = 'ujian' AND scope = 'sidebar') THEN
    INSERT INTO public.menus (key, name, icon, color, order_index, is_active, scope, superadmin_only, required_structural_level, required_functional_role, context_required)
    VALUES ('ujian', 'Ujian', 'Award', 'text-amber-400', 2, true, 'sidebar', false, null, null, false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.menus WHERE key = 'event' AND scope = 'sidebar') THEN
    INSERT INTO public.menus (key, name, icon, color, order_index, is_active, scope, superadmin_only, required_structural_level, required_functional_role, context_required)
    VALUES ('event', 'Pertandingan', 'ScrollText', 'text-purple-400', 3, true, 'sidebar', false, null, null, false);
  END IF;
END $$;
