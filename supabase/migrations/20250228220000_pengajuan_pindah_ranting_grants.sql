-- Perbaikan "permission denied" untuk tabel pengajuan_pindah_ranting.
-- Jalankan di Supabase Dashboard → SQL Editor (sebagai superuser).

GRANT ALL ON public.pengajuan_pindah_ranting TO anon;
GRANT ALL ON public.pengajuan_pindah_ranting TO authenticated;

-- Opsional: izinkan sequence jika pakai SERIAL (tabel ini pakai uuid, tidak wajib)
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
