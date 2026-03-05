# Panduan Pengaturan inkai-app

Dokumen ini memetakan **di mana** dan **untuk apa** setiap pengaturan di aplikasi, agar tidak bingung.

---

## Satu pintu: Dashboard → Settings

**URL:** `/dashboard/settings`  
**Akses:** Hanya **Superadmin**.

Semua pengaturan sistem ada di sini, dibagi menjadi **3 mode** (tombol di kanan atas):

| Mode | Untuk apa |
|------|-----------|
| **Users** | Kelola akun pengguna, profil, password, role, akses menu, log aktivitas |
| **Menu** | Kelola item menu sidebar (dari DB) — navigasi yang muncul di kiri dashboard |
| **Database** | Lihat struktur tabel & audit (untuk development/debug) |

---

## Mode Users (Akun & Profil)

1. **Pilih user** di daftar kiri.
2. Di panel kanan ada **4 tab**:

| Tab | Isi | Catatan |
|-----|-----|--------|
| **Profil** | Nama, alamat, wilayah, **level hirarki**, jabatan (ringkasan) | Level & domisili di sini dipakai untuk scope (mis. Home Base, filter wilayah). Untuk **banyak jabatan** per user → pakai tab Role Management. |
| **Ubah Password** | Form ganti password untuk user tersebut | - |
| **Role Management** | Jabatan organisasi (Kohai → Ranting → Cabang → Pengprov → PP) + Role Fungsional | **Ini yang mengisi scope** (cabang_ids, dll.). Tambah jabatan + pilih Cabang/Ranting/Provinsi agar user punya akses ke modul sesuai level. |
| **Log Aktivitas** | Riwayat aktivitas user | - |

3. Di bawah daftar user ada **Akses Menu** (bisa dibuka/tutup):  
   Matrix **permission per menu** (baca, tambah, ubah, hapus) untuk user yang dipilih. Simpan lewat tombol Simpan Akses.

**Singkatnya:**  
- **Profil** = data diri + **satu** level/jabatan ringkas + domisili.  
- **Role Management** = **jabatan lengkap** (bisa banyak) + link ke Cabang/Ranting/Provinsi → ini yang bikin menu & scope (mis. Home Base) jalan.

---

## Mode Menu (Navigasi & Akses)

- Daftar **menu** yang muncul di sidebar dashboard.
- CRUD: tambah, edit, hapus item menu.
- Menu di sidebar **100% dari sini** (DB); RBAC menentukan siapa boleh lihat mana.

---

## Mode Database (Audit & Struktur)

- Lihat tabel-tabel di DB, kolom, relasi, isi data.
- Berguna untuk debug atau cek struktur; bukan untuk konfigurasi bisnis sehari-hari.

---

## Pengaturan lain (di luar halaman Settings)

| Di mana | Apa | Siapa |
|---------|-----|--------|
| **Topbar → ikon profil** | Modal **Profil saya** (nama, alamat, dll.) | Semua user (edit profil sendiri) |
| **File .env** | Konfigurasi env (root email, Supabase, dll.) | Developer / deploy |

---

## Alur singkat: bikin user “Ketua Cabang Surabaya”

1. **Settings** → mode **Users** → pilih user.
2. Tab **Profil**: isi domisili (wilayah), level bisa diset **Cabang** (opsional, untuk tampilan/legacy).
3. Tab **Role Management**: Level = Cabang, Nama jabatan = Ketua cabang, **Cabang** = pilih cabang Surabaya → **Tambah (manual)**.
4. Tab **Akses Menu** (bawah kiri): pastikan permission menu yang diperlukan (mis. Home Base, Keanggotaan) ada.
5. Setelah disimpan, user itu punya scope cabang tersebut dan menu sesuai RBAC.

---

*Terakhir diperbarui: Maret 2025*
