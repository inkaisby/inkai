-- Cek isi tabel Keanggotaan: KYU, DAN, Pelatihan
-- Jalankan di Supabase Dashboard → SQL Editor.
-- Jika satu Run hanya menampilkan satu hasil, jalankan per blok (blok 1, lalu 2, lalu 3).

-- ---------- 1) Isi tabel KYU ----------
SELECT id, profile_id, level, no_ijazah, tanggal_ijazah, created_at
FROM public.kyu
ORDER BY created_at DESC;

-- ---------- 2) Isi tabel DAN ----------
SELECT id, profile_id, dan, tanggal, msh_number, created_at
FROM public.dan
ORDER BY created_at DESC;

-- ---------- 3) Isi tabel Pelatihan ----------
SELECT id, profile_id, nama, tanggal, kategori, created_at
FROM public.pelatihan
ORDER BY created_at DESC;
