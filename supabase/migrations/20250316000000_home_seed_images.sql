-- Data awal beserta gambar (URL placeholder) untuk feed dan marketplace.
-- Jalankan setelah 20250315000000_home_feed_marketplace.

-- Feed: gambar per tipe (event, pengumuman, dojo)
UPDATE public.home_feed
SET image_path = 'https://placehold.co/600x400/1e293b/ea580c?text=Gashuku+Event'
WHERE type = 'event' AND (image_path IS NULL OR image_path = '');

UPDATE public.home_feed
SET image_path = 'https://placehold.co/600x400/1e293b/14b8a6?text=Pengumuman'
WHERE type = 'pengumuman' AND (image_path IS NULL OR image_path = '');

UPDATE public.home_feed
SET image_path = 'https://placehold.co/600x400/1e293b/22c55e?text=Jadwal+Latihan'
WHERE type = 'dojo' AND (image_path IS NULL OR image_path = '');

-- Marketplace: gambar per item (by title)
UPDATE public.home_marketplace
SET image_path = 'https://placehold.co/400x400/1e293b/94a3b8?text=Seragam+INKAI'
WHERE title = 'Seragam INKAI' AND (image_path IS NULL OR image_path = '');

UPDATE public.home_marketplace
SET image_path = 'https://placehold.co/400x400/1e293b/f59e0b?text=Sabuk'
WHERE title = 'Sabuk Latihan' AND (image_path IS NULL OR image_path = '');

UPDATE public.home_marketplace
SET image_path = 'https://placehold.co/400x400/1e293b/0ea5e9?text=Buku+Panduan'
WHERE title = 'Buku Panduan Kyu' AND (image_path IS NULL OR image_path = '');

UPDATE public.home_marketplace
SET image_path = 'https://placehold.co/400x400/1e293b/8b5cf6?text=Tas+Dojo'
WHERE title = 'Tas Dojo' AND (image_path IS NULL OR image_path = '');
