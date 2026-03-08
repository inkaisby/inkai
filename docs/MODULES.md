# Daftar Modul — inkai-app

Daftar modul dashboard dan statusnya untuk acuan bersih-bersih / refactor.

---

## ✅ Modul yang dipakai (lengkap)

| Route | Folder halaman | Modul (isi) | Keterangan |
|-------|-----------------|-------------|------------|
| `/dashboard` | `app/dashboard/page.tsx` | `modules/dashboard/DashboardHome.tsx` | Home dashboard, statistik, akses cepat |
| `/dashboard/home-base` | `app/dashboard/home-base/page.tsx` | `modules/homebase/HomeBaseModule.tsx` | Home Base: peta, ranting, event, link modul |
| `/dashboard/keanggotaan` | `app/dashboard/keanggotaan/page.tsx` | `modules/keanggotaan/KeanggotaanModule.tsx` | Keanggotaan, KYU/DAN, pelatihan, pindah ranting |
| `/dashboard/anggota-ranting` | `app/dashboard/anggota-ranting/page.tsx` | `modules/anggota-ranting/AnggotaRantingModule.tsx` | Anggota per ranting, import |
| `/dashboard/event` | `app/dashboard/event/page.tsx` | `modules/event/EventModule.tsx` | Tab: UKT (Pendaftaran, Resume, Riwayat, Kelola) |
| `/dashboard/ukt` | `app/dashboard/ukt/page.tsx` | `modules/audit-ujian/AuditUjianModule.tsx` | UKT (Ujian Kenaikan Tingkat). `/dashboard/audit`, `/dashboard/ujian`, `/dashboard/audit-ujian` di-redirect ke sini. |
| `/dashboard/ranting` | `app/dashboard/ranting/page.tsx` | `modules/ranting/RantingModule.tsx` | CRUD ranting |
| `/dashboard/keuangan` | `app/dashboard/keuangan/page.tsx` | `modules/keuangan/KeuanganModule.tsx` | Keuangan, pembayaran, kwitansi |
| `/dashboard/pertandingan` | `app/dashboard/pertandingan/page.tsx` | `modules/pertandingan/PertandinganModule.tsx` | Pertandingan (placeholder isi) |
| `/dashboard/settings` | `app/dashboard/settings/page.tsx` | `modules/settings/SettingsModule.tsx` | Pengaturan: Users, Menu, Roles, DB, dll. |
| `/dashboard/print/kwitansi` | `app/dashboard/print/kwitansi/page.tsx` | (inline) | Cetak kwitansi by token |

---

## 🗑️ Modul yang sudah dihapus

- **Absensi** — route `app/dashboard/absensi/` + `modules/absensi/` (placeholder).
- **Penilaian** — route `app/dashboard/penilaian/` + `modules/penilaian/` (placeholder/kosong).
- **Jadwal** — folder `app/dashboard/jadwal/` + `modules/jadwal/` (kosong).
- **Organisasi** — folder `app/dashboard/organisasi/` (kosong).
- **User (modul)** — `modules/user/UserModule.tsx` (tidak dipakai).

Jika di tabel `menus` masih ada baris dengan `key` = `absensi`, `penilaian`, `jadwal`, atau `organisasi`, hapus atau nonaktifkan agar link sidebar tidak 404.

---

## 📌 Catatan

- **Menu sidebar** datang dari database (tabel `menus`, API `/api/sidebar/menus`). Yang tampil = baris dengan `scope = 'sidebar'` dan `is_active = true`, dan user punya akses (canAccess).
- **Redirect UKT:** `/dashboard/audit`, `/dashboard/ujian`, `/dashboard/audit-ujian` di-redirect ke `/dashboard/ukt` (di `next.config.ts`). Menu dengan key `ujian` atau `audit-ujian` mengarah ke `/dashboard/ukt`.

---

*Terakhir diperbarui: bersih-bersih final (core, TabContent, developing, dojo, alias UKT, setRole duplikat, deps).*
