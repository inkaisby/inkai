# Audit Settings — Lengkap & Saran Pamungkas

## 1. Struktur halaman Settings

| Bagian | Komponen | Fungsi |
|--------|----------|--------|
| **Mode** | Users / Master Data | Kelola user + CRUD data inti sistem (Menu Sidebar + Konfigurasi Fitur) |
| **Kiri (Users)** | EmailList | Daftar user dari `/api/users`, pilih user |
| **Kiri (Users)** | PermissionMatrix | Read/Create/Update/Delete per menu → simpan ke `/api/permissions` |
| **Kanan** | Tab Profil | Edit identitas, wilayah, role, level, email_allowed |
| **Kanan** | Tab Ubah Password | Ganti password user |
| **Kanan** | Tab Role Management | Multi jabatan struktural (hirarki) + fungsional |
| **Kanan** | Tab Log Aktivitas | Log aktivitas user |

---

## 2. Temuan: dobel & tumpang tindih

### 2.1 Sumber kebenaran jabatan (structural) — dua tempat

- **Tab Profil:** field **Level Struktural** dan **Jabatan Struktural (role)** → disimpan di `profiles.structural_level` dan `profiles.structural_role` (satu level, satu role teks).
- **Tab Role Management:** multi jabatan dari `user_structural_roles` + `structural_role_master` (banyak jabatan per user, per organisasi).

**Akibat:** User bisa bingung: ubah di Profil vs di Role Management. Data bisa tidak konsisten (profil bilang L4, Role Management punya beberapa jabatan lain).

**Saran:**  
- **Opsi A (minimal):** Di tab Profil tambah catatan: *“Untuk multi jabatan dan jabatan per Ranting/Cabang/Provinsi, gunakan tab Role Management. Field di sini hanya ringkasan/legacy.”*  
- **Opsi B (ideal):** Hapus Level/Jabatan dari Profil; satu sumber kebenaran hanya di Role Management. Atau tampilkan di Profil hanya baca (derived dari user_structural_roles).

### 2.2 Permission (menu) vs Role (struktural)

- **Permission (kiri):** Read/Create/Update/Delete **per menu** (Dashboard, Keanggotaan, Settings, …) → dipakai untuk akses fitur (canAccess, sidebar).
- **Role Management:** Jabatan **struktural** (Ketua Ranting, Pengprov, dll.) dan **fungsional** (Penguji, Wasit, dll.).

Keduanya beda: permission = akses menu/aksi; role = identitas organisasi. Tidak dobel, tapi perlu jelas di UI bahwa “Permission” = akses menu, “Role Management” = jabatan organisasi.

**Saran:** Tambah sublabel singkat di Permission: *“Akses per menu (baca/tambah/ubah/hapus)”* dan di Role: *“Jabatan organisasi (hirarki + fungsional)”*.

### 2.3 Email “selected” di page vs di View

- **Page (settings/page.tsx):** state `selectedEmail` dipakai untuk load/save **Permission** (`/api/permissions?email=...`).
- **SettingsView:** state internal `selectedUser` (UserRow); **tidak** memanggil `onSelectEmail` saat user dipilih.

**Akibat:** Saat user memilih baris di Daftar Pengguna, hanya `selectedUser` yang berubah. `selectedEmail` di page bisa tetap null atau lama. **Simpan Akses** lalu memakai `selectedEmail` → bisa salah user atau tidak tersimpan.

**Saran (wajib):** Sinkronkan: saat `selectedUser` berubah, panggil `onSelectEmail(selectedUser?.email ?? null)` dan (opsional) reload permissions untuk email itu. **Sudah diperbaiki di kode.**

---

## 3. Bug kritis

### 3.1 Tombol “Simpan Perubahan” di tab Profil tidak menyimpan

- **Lokasi:** ProfilePanel.tsx — tombol “Simpan Perubahan” hanya `disabled={!dirty}`, **tanpa `onClick`**.
- **Akibat:** Semua perubahan di Profil (nama, NIK, role, level, email allowed, dll.) **tidak pernah dikirim ke server**.

**Saran:** Tambah API untuk update profil (mis. `PUT /api/settings/profile` dengan `user_id` + payload) dan di ProfilePanel beri `onClick` yang memanggil API lalu refresh data / tutup form. **Perbaikan:** API + wiring tombol ditambahkan.

### 3.2 Dropdown yang “tidak terlihat”

- **Level Struktural** dan **Email Diizinkan** di Profil sebelumnya pakai `<select>`; di tema gelap opsi tidak terbaca.
- **Perbaikan yang sudah dilakukan:** Level diganti jadi tombol (1—Kohai … 5—PP); Email Diizinkan jadi tombol Ya/Tidak.

---

## 4. Ringkasan saran pamungkas

| No | Temuan | Saran |
|----|--------|--------|
| 1 | Profil “Simpan Perubahan” tidak nyambung ke API | Tambah API update profil + pasang handler simpan di ProfilePanel (sudah ditambahkan). |
| 2 | selectedEmail tidak ikut saat pilih user | Di SettingsView, saat `selectedUser` berubah panggil `onSelectEmail(selectedUser?.email ?? null)` (sudah ditambahkan). |
| 3 | Dua tempat set “jabatan” (Profil vs Role Management) | Jelaskan di UI: Profil = ringkasan/legacy; multi jabatan hanya di Role Management. Atau jadikan Profil read-only untuk level/role. |
| 4 | Permission vs Role kurang jelas | Sublabel: Permission = akses per menu; Role = jabatan organisasi. |
| 5 | Nama “Belum Lengkap” di daftar user | Bisa tambah indikator (badge) “Profil belum lengkap” dan link cepat ke tab Profil. |
| 6 | Konsistensi bahasa | Pastikan label konsisten Indonesia (e.g. “Email Diizinkan” sudah; “Permission” bisa “Akses Menu”). |

---

## 5. Alur data (referensi)

- **Daftar user:** GET `/api/users` (Superadmin; merge auth.users + profiles).
- **Permission per menu:** GET/POST `/api/permissions` (by email).
- **Profil user:** Saat ini dari object `user` (UserRow) di client; simpan via API yang baru (PUT `/api/settings/profile` atau serupa).
- **Jabatan struktural:** Tabel `user_structural_roles` + `structural_role_master`; tambah/ubah dari tab Role Management (dan seed jabatan default lewat tombol/API).

Setelah perbaikan 1 dan 2, Simpan Perubahan profil berfungsi dan Simpan Akses permission menempel ke user yang benar.
