# Saran pamungkas: Keamanan inkai-app

Dokumen ini berisi audit keamanan dan rekomendasi untuk melindungi inkai-app dari serangan hacking, data breach, dan eksploitasi.

---

## 1. Yang sudah diterapkan

### 1.1 Autentikasi & otorisasi

- **Supabase Auth** untuk login, session, reset password.
- **Middleware** melindungi `/dashboard/*` — redirect ke login jika tidak ada session.
- **API routes** memakai `getSessionUser()` atau `requireSuperadmin()` sebelum akses data.
- **RLS (Row Level Security)** di Supabase untuk membatasi akses data per user.
- **Service role key** hanya di server (`server-only`), tidak pernah dikirim ke client.

### 1.2 Input validation

- **UUID validation** (`app/lib/security/validateUuid.ts`) untuk `userId` di API sensitif (change-password, profile, users/[id]) — mencegah injection dan parameter tidak valid.
- Supabase client memakai query terparameter (bukan raw SQL) — aman dari SQL injection.

### 1.3 Security headers (middleware)

- **X-Frame-Options: DENY** — mencegah clickjacking.
- **X-Content-Type-Options: nosniff** — mencegah MIME sniffing.
- **Referrer-Policy: strict-origin-when-cross-origin** — batasi kebocoran referrer.
- **X-XSS-Protection: 1; mode=block** — tambahan proteksi XSS di browser lama.

### 1.4 Lainnya

- **productionBrowserSourceMaps: false** — source map tidak dikirim ke production.
- **.env*** di `.gitignore` — rahasia tidak masuk ke repo.
- **NEXT_PUBLIC_** hanya untuk nilai yang memang boleh publik (URL, anon key).

---

## 2. Rekomendasi prioritas tinggi

### 2.1 Rate limiting

**Masalah:** Endpoint seperti `/api/reset/send` (reset password) tidak dibatasi — bisa dipakai untuk spam email atau brute force.

**Tindakan:**

- Tambah rate limiting (mis. max 3 request per IP per 15 menit) untuk:
  - `POST /api/reset/send`
  - `POST /auth/login` (jika pakai custom endpoint)
- Opsi: **Upstash Redis** atau **Vercel KV** untuk rate limit di serverless.
- Alternatif sederhana: pakai **Supabase Edge Functions** dengan rate limit, atau **Cloudflare** di depan.

### 2.2 Content Security Policy (CSP)

**Tindakan:** Tambah header CSP di `next.config.ts` atau middleware:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co
```

Sesuaikan `script-src` jika pakai inline script (Next.js kadang butuh `unsafe-inline`). Uji dulu agar tidak memecah UI.

### 2.3 Upgrade auth helpers

**Masalah:** `@supabase/auth-helpers-nextjs` deprecated. Proyek juga pakai `@supabase/ssr`.

**Tindakan:** Migrasi penuh ke `@supabase/ssr` untuk middleware dan session. Ikuti [Supabase Auth Helpers Migration](https://supabase.com/docs/guides/auth/auth-helpers/auth-ui-migration).

### 2.4 Audit API routes

Pastikan **setiap** API route yang akses data sensitif:

1. Memanggil `getSessionUser()` atau `requireSuperadmin()`.
2. Memvalidasi input (UUID, email format, dll.).
3. Tidak mengembalikan data user lain tanpa cek scope/wilayah.

---

## 3. Rekomendasi prioritas menengah

### 3.1 CORS

- Next.js API routes default: same-origin. Jika ada akses dari domain lain, set CORS eksplisit.
- Jangan pakai `Access-Control-Allow-Origin: *` untuk endpoint yang butuh auth.

### 3.2 Logging & monitoring

- Log akses gagal (401, 403) dan aktivitas sensitif (ubah password, hapus user).
- Pertimbangkan **Sentry** atau **LogRocket** untuk error tracking.
- Supabase Dashboard: pantau Auth logs dan Database logs.

### 3.3 Password policy

- Minimum 8 karakter (sudah diterapkan).
- Pertimbangkan: kompleksitas (huruf besar, angka, simbol), expiry, history.

### 3.4 Session management

- Supabase mengelola refresh token. Pastikan **JWT expiry** wajar (default ~1 jam).
- Untuk "force logout semua sesi": Supabase v2.149+ — update password bisa invalidate sesi.

---

## 4. Rekomendasi prioritas rendah

### 4.1 HTTPS

- Pastikan production selalu **HTTPS** (Vercel/Netlify default).
- Set **Strict-Transport-Security (HSTS)** jika memungkinkan.

### 4.2 Dependency audit

- Jalankan `npm audit` secara berkala.
- Perbarui dependensi yang punya CVE.

### 4.3 Backup & recovery

- Supabase: Point-in-time recovery (jika tersedia di plan).
- Backup rutin untuk data kritis.

---

## 5. Checklist cepat

| Item | Status |
|------|--------|
| Session/auth di semua route sensitif | ✅ |
| UUID validation untuk params | ✅ |
| Security headers | ✅ |
| .env tidak di-commit | ✅ |
| Service role hanya server-side | ✅ |
| Rate limiting reset/send | ⏳ Rekomendasi |
| CSP header | ⏳ Rekomendasi |
| Migrasi ke @supabase/ssr | ⏳ Rekomendasi |

---

## 6. Jika terjadi insiden

1. **Rotate keys:** Supabase Dashboard → Settings → API — regenerate anon key & service role key.
2. **Cek logs:** Auth, Database, API.
3. **Force logout:** Update password user yang terdampak.
4. **Notifikasi:** Jika data pribadi bocor, ikuti kebijakan privasi dan regulasi (GDPR, UU PDP).

---

*Terakhir diperbarui: audit keamanan inkai-app.*
