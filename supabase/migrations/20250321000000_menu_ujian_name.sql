-- Menu UKT: nama di DB disamakan dengan tampilan sidebar (UKT = Ujian Kenaikan Tingkat).
-- Akses level 2–5 tetap diatur di canAccess.ts; ini hanya update label di tabel menus.
UPDATE public.menus
SET name = 'UKT (Ujian Kenaikan Tingkat)'
WHERE key = 'ujian' AND scope = 'sidebar';
