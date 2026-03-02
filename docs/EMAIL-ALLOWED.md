# Arti `email_allowed` (profiles)

## Maksud

**`email_allowed`** di tabel **`profiles`** artinya: **apakah akun ini diizinkan (aktif) atau ditangguhkan**.

| Nilai   | Arti di sistem | Dampak akses |
|--------|-----------------|--------------|
| `true` | Akun **disetujui / aktif** | User bisa akses menu sesuai role (level struktural, role fungsional, dll.). |
| `false`| Akun **ditangguhkan / belum disetujui** | User hanya boleh lihat **Dashboard**; menu lain disembunyikan. |

Bukan tentang “boleh terima email” atau “email terverifikasi”, melainkan **status persetujuan akun** untuk pakai aplikasi.

---

## Di mana dipakai

1. **Sidebar / menu** (`canAccess.ts`)  
   Jika `email_allowed === false`, hanya menu **Dashboard** yang diizinkan; menu lain (Keanggotaan, Ujian, Event, Settings, dll.) tidak tampil.

2. **Settings → Daftar Pengguna** (EmailList)  
   Kolom status: tombol **Allowed** (hijau) / **Blocked** (merah). Superadmin bisa ubah dengan klik; itu mengubah `profiles.email_allowed`.

3. **Settings → Edit Profil** (ProfilePanel)  
   Status Akun: **Aktif** / **Pending** / **Ditangguhkan**. Nilai itu mengisi atau terkait `email_allowed` (mis. Aktif = true, Ditangguhkan = false).

4. **Dashboard layout**  
   Jika `profile.email_allowed === false`, bisa dipakai untuk membatasi aksi tertentu (mis. tidak trigger modal lengkapi profil).

5. **API**  
   `/api/sidebar/menus`, `/api/me`, dll. mengirim `email_allowed` ke client agar UI tahu status akun.

---

## Default & siapa yang mengatur

- **Default** (saat user baru daftar): di migrasi/trigger bisa di-set **`true`** atau **`false`** (tergantung kebijakan: auto-approve atau harus disetujui dulu).
- **Yang mengatur:** Superadmin (atau role yang punya akses Settings) lewat Daftar Pengguna (Allowed/Blocked) atau Edit Profil (Status Akun).

---

## Ringkas

**`email_allowed`** = **“Akun ini boleh pakai aplikasi (aktif) atau tidak (ditangguhkan).”**  
- **true** → akses sesuai role.  
- **false** → hanya Dashboard; menu lain disembunyikan.

Nama kolom “email_allowed” dipakai historis; secara perilaku lebih tepat dibaca sebagai **“account allowed”** / **akun diizinkan**.
