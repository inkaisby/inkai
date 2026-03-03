# Audit: Delay Sidebar & Menu (Klik Menu Lambat Menampilkan Isi)

## Ringkasan

Audit ini memeriksa penyebab **delay saat pengguna mengklik item menu sidebar**—konten terasa lambat atau layar kosong sebelum isi halaman tampil.

---

## Penyebab yang Ditemukan

### 1. Tidak ada Loading UI (Utama)

- **Sebelum:** Tidak ada file `loading.tsx` di bawah `app/dashboard/`. Saat navigasi (klik menu), Next.js melakukan client-side navigation tapi area konten tidak menampilkan indikator loading; pengguna melihat layar kosong atau konten lama sampai halaman baru selesai di-render.
- **Dampak:** Persepsi “klik tidak responsif” atau “sangat delay”.

### 2. Sidebar: Request Berurutan (Waterfall)

- **Sebelum:** Sidebar memuat data dengan 4 langkah berurutan:
  1. `supabase.auth.getUser()`
  2. `profiles` (select by user_id)
  3. `get_user_structural_roles` (RPC)
  4. `get_sidebar_menus` (RPC)
- **Dampak:** Waktu tampil menu sidebar = jumlah semua latency; pemuatan awal terasa lebih lambat.

### 3. Halaman Berat (Siswa, Keanggotaan, Settings)

- **Siswa:** Banyak komponen (WilayahExplorer, StudentList, StudentContext, dll.) + `StudentProvider`/`WilayahProvider` + fetch data siswa. Layout dan data load menambah waktu sampai konten tampil.
- **Keanggotaan:** `useMyKeanggotaan` (getUser + profiles) + banyak tab; konten tampil setelah data siap.
- **Settings:** `getSession` dulu, lalu load permissions; ada state loading internal tapi tanpa skeleton di level route.
- **Dampak:** Setelah navigasi, masih ada fase “loading” atau kosong sebelum konten benar-benar tampil.

### 4. Middleware

- **Middleware** (`middleware.ts`) memanggil `supabase.auth.getSession()` untuk route `/dashboard/*`. Ini menambah latency sekali per request, tapi bukan penyebab utama delay *setelah* klik menu (navigasi client-side).

---

## Perbaikan yang Diterapkan

### 1. Loading UI (Instant Feedback)

- **`app/dashboard/loading.tsx`**  
  Skeleton umum untuk semua navigasi di dalam dashboard. Begitu pengguna mengklik menu, area konten langsung menampilkan skeleton, bukan layar kosong.

- **`app/dashboard/siswa/loading.tsx`**  
  Skeleton khusus layout Siswa (kolom kiri/tengah/kanan).

- **`app/dashboard/keanggotaan/loading.tsx`**  
  Skeleton untuk halaman Keanggotaan (tabs + konten).

- **`app/dashboard/settings/loading.tsx`**  
  Skeleton untuk halaman Settings.

Dengan ini, setiap klik menu langsung memberikan feedback visual (skeleton) saat halaman dan data masih loading.

### 2. Sidebar: Request Paralel

- Di **`app/dashboard/components/dashboard/Sidebar.tsx`**, setelah `getUser()` dan ada `user.id`, tiga request berikut dijalankan **paralel** dengan `Promise.all`:
  - `profiles` (select)
  - `get_user_structural_roles` (RPC)
  - `get_sidebar_menus` (RPC)
- Menu sidebar tampil lebih cepat karena total waktu mendekati satu round-trip, bukan empat berurutan.
- Beberapa `console.log` yang tidak perlu di production dihapus untuk mengurangi kebisingan.

---

## Perbaikan Lanjutan: Bootstrap Satu Fetch (Diterapkan)

- **Satu panggilan** `/api/sidebar/menus` mengembalikan `user` + `menus` + `profile_completed`. Layout memanggil ini sekali, mengisi **bootstrap store** (Zustand) dengan TTL 5 menit.
- **Layout** memakai bootstrap untuk auth gate (profile_completed, email_allowed); tidak lagi memanggil `/api/me` terpisah.
- **Sidebar** hanya membaca dari store (tanpa fetch sendiri).
- **Settings** dan **ScopeContext** memakai session/scope dari store; tidak memanggil `/api/me` untuk session.
- Dampak: refresh/navigasi hanya satu round-trip untuk chrome (session + menu), lalu konten halaman load. Duplikasi `/api/me` dihilangkan.

## Rekomendasi Lanjutan (Opsional)

1. **Dynamic import untuk halaman berat**  
   Gunakan `next/dynamic` dengan `loading` untuk route Siswa/Keanggotaan agar chunk halaman tersebut di-load on demand. Ukuran bundle initial dashboard berkurang; navigasi pertama ke halaman itu tetap bisa memakai `loading.tsx` yang sudah ada.

2. **Cache / stale-while-revalidate untuk menu**  
   Jika daftar menu jarang berubah, bisa cache hasil `get_sidebar_menus` (mis. di memory atau sessionStorage) dengan TTL singkat agar navigasi berikutnya terasa lebih cepat.

3. **Prefetch agresif**  
   Sidebar sudah memakai `router.prefetch(href)` untuk setiap menu. Tetap dipertahankan; bisa ditambah prefetch on hover jika ingin respons lebih cepat saat hover.

---

## Checklist Verifikasi

- [x] Ada `app/dashboard/loading.tsx` dan diuji dengan klik antar menu.
- [x] Ada loading spesifik untuk siswa, keanggotaan, dan settings.
- [x] Sidebar memuat profile, structural roles, dan menus secara paralel.
- [ ] (Opsional) Uji dengan throttling jaringan (DevTools → Network) untuk memastikan skeleton tampil dengan baik saat koneksi lambat.

---

## File yang Diubah/Ditambah

| File | Perubahan |
|------|-----------|
| `app/dashboard/loading.tsx` | **Baru** – Skeleton umum dashboard |
| `app/dashboard/siswa/loading.tsx` | **Baru** – Skeleton halaman Siswa |
| `app/dashboard/keanggotaan/loading.tsx` | **Baru** – Skeleton halaman Keanggotaan |
| `app/dashboard/settings/loading.tsx` | **Baru** – Skeleton halaman Settings |
| `app/dashboard/components/dashboard/Sidebar.tsx` | Load session + menus dengan `Promise.all`; hapus console.log yang tidak perlu |

Dengan perubahan ini, klik menu sidebar seharusnya terasa lebih responsif dan delay tampil isi berkurang berkat loading state yang konsisten dan pemuatan data sidebar yang lebih efisien.
