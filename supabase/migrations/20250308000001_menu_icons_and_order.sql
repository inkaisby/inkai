-- Tukar icon: Home (dashboard) pakai Home, Dashboard (home-base) pakai LayoutDashboard
-- Urutan: Home, Dashboard, Keanggotaan, Anggota Ranting, lalu menu lain (order_index >= 1)
UPDATE public.menus SET icon = 'Home', order_index = 1 WHERE key = 'dashboard' AND scope = 'sidebar';
UPDATE public.menus SET icon = 'LayoutDashboard', order_index = 2 WHERE key = 'home-base' AND scope = 'sidebar';
UPDATE public.menus SET order_index = 3 WHERE key = 'keanggotaan' AND scope = 'sidebar';
UPDATE public.menus SET order_index = 4 WHERE key = 'anggota-ranting' AND scope = 'sidebar';
UPDATE public.menus SET order_index = 5 WHERE key = 'event' AND scope = 'sidebar';
UPDATE public.menus SET order_index = 6 WHERE key = 'ranting' AND scope = 'sidebar';
UPDATE public.menus SET order_index = 7 WHERE key = 'ujian' AND scope = 'sidebar';
