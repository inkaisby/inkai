# Cek Supabase — inkai-app

## 1. Konfigurasi client

| File | Fungsi |
|------|--------|
| `app/lib/supabaseBrowser.ts` | Client browser (anon key): auth, realtime. Butuh `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`. |
| `app/lib/supabaseServer.ts` | Client server (anon key + cookies): auth di API/SSR. |
| `app/lib/supabase/admin.ts` | Client server (service_role): bypass RLS, hanya server. Butuh `SUPABASE_SERVICE_ROLE_KEY`. |

**Env wajib (lihat `.env.example`):**
- `NEXT_PUBLIC_SUPABASE_URL` — URL project (lokal: `http://127.0.0.1:54321`, cloud: `https://<ref>.supabase.co`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Anon key (Dashboard → Settings → API)
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (server-only, jangan bocor ke client)

---

## 2. Realtime

- **Tabel:** `public.ukt_pendaftaran` sudah ditambah ke publication `supabase_realtime` lewat migrasi:
  - `supabase/migrations/20250311000000_realtime_ukt_pendaftaran.sql`
- **Aplikasi:** Halaman UKT (`/dashboard/ukt`) subscribe ke `postgres_changes` tabel `ukt_pendaftaran` di `AuditUjianModule.tsx`; saat ada INSERT/UPDATE/DELETE, ringkasan dan tabel pendaftaran di-refetch.

**Yang perlu dicek:**
- Migrasi sudah dijalankan di project (lokal: `supabase db reset` atau `supabase migration up`, cloud: `supabase db push`).
- Di Supabase Cloud: **Database → Replication** — pastikan tabel `ukt_pendaftaran` ter-centang untuk Realtime (biasanya otomatis setelah migrasi).

---

## 3. Tabel UKT & RLS

- **`ukt_tahun_ajaran`** — RLS aktif; policy `Allow read ukt_tahun_ajaran`: SELECT untuk `authenticated` (USING true).
- **`ukt_pendaftaran`** — RLS aktif; policy `Allow read ukt_pendaftaran`: SELECT untuk `authenticated` (USING true).
- **Grant:** `service_role` dan `authenticated` punya akses penuh ke kedua tabel; `anon` juga di-grant (untuk auth flow). Operasi tulis (INSERT/UPDATE/DELETE) dari app dilakukan lewat **API route** yang memakai **admin (service_role)** client, bukan client browser.

---

## 4. Cek cepat di project

1. **Env**
   - Ada file `.env.local` (atau env di Vercel) dengan `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

2. **Migrasi**
   - Lokal: `npx supabase db push` atau `supabase migration up`
   - Pastikan migrasi `20250311000000_realtime_ukt_pendaftaran.sql` ikut terjalankan.

3. **Realtime di browser**
   - Buka `/dashboard/ukt`, buka DevTools → Network (atau Console). Saat ada perubahan data di `ukt_pendaftaran` (dari tab lain atau user lain), halaman harus refetch ringkasan dan tabel tanpa refresh manual.

4. **Supabase Cloud**
   - Dashboard → **Database → Replication** → pastikan **ukt_pendaftaran** aktif untuk Realtime.

---

## 5. Referensi

- Supabase Realtime: https://supabase.com/docs/guides/realtime
- Env: `.env.example` di root project.
