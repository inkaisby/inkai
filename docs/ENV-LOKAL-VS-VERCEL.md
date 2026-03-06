# Konsistensi Lokal vs Vercel

Agar data (nama, menu, level, dll.) sama antara lokal dan Vercel untuk user yang sama, **keduanya harus memakai Supabase project yang sama**.

## Variabel yang harus sama

| Variabel | Lokal (`.env.local`) | Vercel (Project Settings → Environment Variables) |
|----------|----------------------|---------------------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Wajib | ✅ Wajib |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Wajib | ✅ Wajib |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Wajib | ✅ Wajib |
| `NEXT_PUBLIC_INKAI_ROOT_EMAIL` | Opsional | Opsional (sama jika dipakai) |
| `NEXT_PUBLIC_APP_URL` | Opsional | Set ke `https://inkai-eight.vercel.app` |

## Langkah cek

### 1. Cek nilai di lokal

```powershell
# Di PowerShell (jangan tampilkan nilai lengkap di layar)
Get-Content .env.local | Select-String "NEXT_PUBLIC_SUPABASE_URL"
```

Atau buka `.env.local` dan bandingkan `NEXT_PUBLIC_SUPABASE_URL` dengan URL project Supabase di Dashboard.

### 2. Cek nilai di Vercel

1. Buka [Vercel Dashboard](https://vercel.com) → project `inkai-eight`
2. **Settings** → **Environment Variables**
3. Pastikan:
   - `NEXT_PUBLIC_SUPABASE_URL` = sama dengan lokal (mis. `https://xxxx.supabase.co`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = sama
   - `SUPABASE_SERVICE_ROLE_KEY` = sama

### 3. Redeploy setelah ubah env

Setelah mengubah Environment Variables di Vercel, lakukan **Redeploy** (Deployments → ⋮ → Redeploy).

## Dua skenario umum

### Skenario A: Pakai Supabase Cloud yang sama

- Lokal dan Vercel memakai **project Supabase Cloud yang sama**
- Data `profiles`, `menus`, `user_structural_roles` sama
- User login dengan email yang sama → nama, menu, level sama di kedua environment

### Skenario B: Lokal pakai Supabase Local, Vercel pakai Cloud

- Lokal: `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` (dari `supabase start`)
- Vercel: `NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co`
- **Data berbeda** karena database berbeda
- Ini wajar untuk development; untuk konsistensi, ubah lokal ke Supabase Cloud yang sama dengan Vercel

## Troubleshooting

| Gejala | Kemungkinan penyebab |
|--------|----------------------|
| Nama berbeda | `profiles.nama` di DB berbeda |
| Menu berbeda | Tabel `menus` atau RBAC (structural_level, scope) berbeda |
| Level "Ranting" vs "Ketua Ranting" | `profiles.structural_level` atau `user_structural_roles` berbeda |
| Session hilang | Cookie per domain; logout dan login ulang di kedua environment |

## Referensi

- `.env.example` — template variabel
- Supabase Dashboard → Settings → API — URL dan keys
