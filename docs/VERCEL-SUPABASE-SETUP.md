# Setup untuk Deploy Vercel

## Masalah umum

1. **API keanggotaan/profile tidak terbaca** – session/konfigurasi Supabase
2. **Kecamatan/Kelurahan menampilkan "—"** – API wilayah perlu `force-dynamic` dan fetch `no-store`

## 1. Supabase Dashboard – URL Configuration

1. Buka **Supabase Dashboard** → project Anda
2. **Authentication** → **URL Configuration**
3. Isi:
   - **Site URL**: `https://inkai-eight.vercel.app` (ganti dengan domain Vercel Anda)
   - **Redirect URLs**: tambahkan:
     - `https://inkai-eight.vercel.app/**`
     - `https://inkai-eight.vercel.app`

## 2. Environment Variables di Vercel

Pastikan di **Vercel** → Project → **Settings** → **Environment Variables**:

- `NEXT_PUBLIC_SUPABASE_URL` – URL project Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` – anon key
- `SUPABASE_SERVICE_ROLE_KEY` – service role key

Semua harus mengarah ke **project Supabase yang sama** (bukan project lokal).

## 3. Login Ulang di Domain Vercel

Cookie session bersifat **per-domain**. Login di localhost tidak berlaku di Vercel.

- Buka `https://inkai-eight.vercel.app`
- Login ulang dengan akun yang sama
- Setelah itu session akan tersimpan untuk domain Vercel

## 4. Middleware – Refresh Session

Middleware memakai `getUser()` (bukan `getSession()`) agar token di-refresh dan cookie diteruskan ke API. Jika 401 tetap muncul:

- Pastikan middleware matcher mencakup `/api/:path*`
- Pastikan `setAll` menulis cookie ke response dan request

## 5. PDF (jsPDF)

Route `/api/anggota/[id]/pdf` memakai `jspdf` (bukan Puppeteer/Chromium) agar ringan dan deploy Vercel lancar. Jangan tambahkan `puppeteer` atau `@sparticuz/chromium` ke `package.json`.

## 6. Cek Response API

Jika masih bermasalah, buka:

`https://inkai-eight.vercel.app/api/keanggotaan/profile`

- **401** + `hint` → kemungkinan masalah session/konfigurasi Supabase
- **404** → session OK, tapi profil tidak ditemukan di DB
- **200** → API berjalan normal

## 7. Error "Deploying outputs... internal error"

Jika build selesai tapi gagal di tahap "Deploying outputs" (bukan error kode):

1. **Deploy via CLI** – `npx vercel login` lalu `npx vercel --prod`
2. **Proyek baru** – Buat project Vercel baru, connect repo yang sama, deploy
3. **Analisis ukuran** – Env var: `VERCEL_ANALYZE_BUILD_OUTPUT=1`, redeploy, cek log
4. **Hubungi Vercel Support** – https://vercel.com/help
   - Sertakan **Deployment ID** (dari Deployments → klik deployment → URL atau detail)
   - Sertakan log: "Build Completed in /vercel/output [Xm], Deploying outputs..., internal error"
