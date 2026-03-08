-- Pastikan menu UKT (Ujian Kenaikan Tingkat) ada di sidebar.
-- Tampil hanya untuk user level 2–5 (diatur di canAccess.ts).
INSERT INTO public.menus (key, name, icon, color, order_index, is_active, scope, superadmin_only, required_structural_level, required_functional_role, context_required)
SELECT 'ujian', 'UKT (Ujian Kenaikan Tingkat)', 'Award', 'text-amber-400', 7, true, 'sidebar', false, null, null, false
WHERE NOT EXISTS (SELECT 1 FROM public.menus WHERE key = 'ujian' AND scope = 'sidebar');

-- Update nama jika baris sudah ada (mis. dari seed lama yang pakai nama "Ujian")
UPDATE public.menus
SET name = 'UKT (Ujian Kenaikan Tingkat)', order_index = 7, is_active = true
WHERE key = 'ujian' AND scope = 'sidebar';
