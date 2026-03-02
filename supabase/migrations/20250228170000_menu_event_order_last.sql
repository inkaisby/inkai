-- Urutan Pertandingan (key=event) di posisi terakhir di sidebar.
UPDATE public.menus
SET order_index = (SELECT COALESCE(MAX(order_index), 0) + 1 FROM public.menus WHERE scope = 'sidebar' AND key <> 'event')
WHERE key = 'event' AND scope = 'sidebar';
