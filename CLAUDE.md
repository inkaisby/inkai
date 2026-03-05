# Project: inkai-app

Konteks proyek ini dipakai agar **Claude Code** dan **Cursor** punya pemahaman yang sama. Jangan hapus; update jika struktur atau stack berubah.

## Tech stack

- **Next.js 15** (App Router), React 18, TypeScript
- **Supabase**: auth, database, RLS; `@supabase/ssr` + `@supabase/auth-helpers-nextjs`
- **Styling**: Tailwind CSS 4, Radix UI, Framer Motion, lucide-react
- **State**: Zustand; form/CRUD di modul dashboard

## Struktur utama

- `app/` – App Router: `page.tsx`, `layout.tsx`, `auth/`, `dashboard/`, `api/`
- `app/auth/` – Login, register, reset-password, reset/update
- `app/dashboard/` – Layout dashboard, Sidebar (menu RBAC), topbar-premium, modul per fitur
- `app/dashboard/modules/` – Satu folder per fitur: keanggotaan, siswa, user, absensi, jadwal, penilaian, keuangan, event, settings
- `app/api/` – Route handlers: auth, users, wilayah (provinces/regencies/districts/villages), ranting, keanggotaan, menu-permissions, profile, reset, sidebar/menus
- Menu sidebar & akses: dari DB (tabel `menus`), API `/api/sidebar/menus`; RBAC di `canAccess.ts` (UNIVERSAL_MENU_KEYS, dll.)
- `app/lib/` – supabaseBrowser, supabaseAdmin, supabasePermissions, wilayah-data/wilayah-static
- `components/` – UI bersama (shadcn-style), providers
- `middleware.ts` – Supabase session; redirect ke login jika belum auth dan akses `/dashboard`

## Konvensi

- **RBAC**: Menu dan akses berdasarkan scope (dashboard, keanggotaan, siswa, user, dll.) dan `canAccess`; beberapa menu `superadminOnly`.
- **API**: Route di `app/api/.../route.ts` (atau `.js` untuk reset); gunakan Supabase client (server/admin) sesuai kebutuhan.
- **Wilayah**: Data wilayah (provinsi/kabupaten/kecamatan/desa) dari API atau `app/lib/wilayah-*`; dipakai di form keanggotaan, profil, siswa.
- **Bahasa**: Kode dan komentar boleh Indonesia atau Inggris; UI Indonesia (e.g. Keanggotaan, Siswa, Pengaturan).

## Commands

- Dev: `npm run dev` (NEXT_DISABLE_TURBOPACK=1)
- Build: `npm run build`
- Lint: `npm run lint`

## Pengaturan (Settings)

- Halaman **Settings** (`/dashboard/settings`) hanya untuk Superadmin.
- Tiga mode: **Users** (profil, password, Role Management, akses menu, log), **Menu** (item sidebar dari DB), **Database** (audit/struktur).
- **Profil** = data diri + level/domisili (ringkasan); **Role Management** = jabatan organisasi + Cabang/Ranting/Provinsi → menentukan scope & akses.
- Panduan lengkap untuk pengguna: **docs/PANDUAN-PENGATURAN.md**.

## Bekerja dengan Cursor

Aturan Cursor yang selaras dengan dokumen ini ada di `.cursor/rules/inkai-app.mdc`. Saat mengedit fitur, rujuk modul di `app/dashboard/modules/<nama>/` dan API terkait di `app/api/`.
