# Deploy & Parity Lokal vs Online

Agar **inkai-app** di lokal dan online **sama ketika ada perubahan**, ikuti dua hal ini.

---

## 1. Env sama (lokal dan online)

Perilaku app bergantung pada environment variables. Supaya lokal dan production konsisten:

- **Lokal:** salin `.env.example` → `.env.local`, isi nilai (Supabase lokal atau cloud).
- **Online (Vercel):** di **Vercel Dashboard → Project → Settings → Environment Variables**, set variabel **yang sama** dengan yang Anda pakai di `.env.local` (minimal yang wajib).

Variabel wajib untuk build & jalan:

| Variable | Lokal | Vercel |
|----------|--------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ .env.local | ✅ Environment Variables |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ .env.local | ✅ Environment Variables |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ .env.local | ✅ Environment Variables (server-only) |

Opsional (superadmin, reset password, dll.) ada di `.env.example`. Jika dipakai di lokal, tambahkan juga di Vercel dengan nilai yang sama.

**Penting:** Di Vercel, centang environment **Production** (dan **Preview** jika ingin preview deployment juga).

---

## 2. Perubahan kode → langsung online

Alur yang disarankan:

1. **Develop di lokal**  
   `npm run dev` → ubah kode → cek di browser.

2. **Commit & push**  
   `git add .` → `git commit -m "..."` → `git push origin main` (atau branch yang dipakai).

3. **CI jalan otomatis**  
   GitHub Actions (`.github/workflows/ci.yml`) menjalankan **lint** dan **build** untuk setiap push/PR ke `main`/`master`. Jika gagal, perbaiki dulu di lokal lalu push lagi.

4. **Deploy online otomatis**  
   Jika repo sudah terhubung ke **Vercel**, setiap push ke branch production (biasanya `main`) akan memicu deploy. Setelah deploy selesai, versi online = kode terbaru yang Anda push.

Dengan begitu, **setiap perubahan yang Anda push akan tampil sama di online** (dengan catatan env di Vercel sudah di-set seperti di atas).

---

## Ringkasan

| Yang diinginkan | Cara |
|-----------------|------|
| Perilaku lokal = online | Set env di Vercel sama dengan `.env.local` (lihat `.env.example`) |
| Perubahan kode langsung live | Push ke branch production → Vercel auto-deploy; pastikan CI (lint/build) lulus |

Jika build di Vercel gagal karena env belum di-set, ikuti pesan error dari `scripts/check-env.js` (muncul saat build) atau cek **Vercel → Project → Settings → Environment Variables**.
