# Patch database: Marketplace (`home_marketplace`)

Jika di **Marketplace Saya** muncul pesan bahwa database belum lengkap (kolom `category`, `description`, dll.), jalankan patch SQL berikut.

## Langkah

1. Buka [Supabase Dashboard](https://supabase.com/dashboard) → proyek Anda.
2. Menu **SQL Editor** → **New query**.
3. Buka file **`docs/sql/fix_home_marketplace.sql`** di repo, salin **seluruh isinya**, tempel di editor, lalu **Run**.

Script ini aman dijalankan lebih dari sekali.

## Alternatif (CLI)

Jika pakai Supabase CLI dan migrasi repo sudah sinkron:

```bash
npx supabase db push
```

Pastikan migrasi berikut sudah ada di folder `supabase/migrations/` (termasuk yang menambah `description`, `category`, `created_by`, `is_active` pada `home_marketplace`).

Untuk **checkout / pesanan pembeli**, jalankan juga migrasi **`home_marketplace_orders`** (file `20260318240000_marketplace_orders.sql`) atau `db push`.
