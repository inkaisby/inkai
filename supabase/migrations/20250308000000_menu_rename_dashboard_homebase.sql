-- Ganti label menu: Dashboard → Home, Home Base → Dashboard
UPDATE public.menus SET name = 'Home' WHERE key = 'dashboard' AND scope = 'sidebar';
UPDATE public.menus SET name = 'Dashboard' WHERE key = 'home-base' AND scope = 'sidebar';
