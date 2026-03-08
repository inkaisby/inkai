# Checklist QA — inkai-app

Daftar pengecekan manual sebelum rilis atau setelah perubahan besar. Jalankan dengan dev server: `npm run dev` (localhost:3000).

---

## 1. Auth & Dashboard

- [ ] **Login** — Masuk dengan email/sandi; redirect ke dashboard.
- [ ] **Logout** — Keluar; redirect ke landing.
- [ ] **Reset password** — Request link dari halaman reset; buka link dan set password baru.
- [ ] **Register** — Daftar akun baru (jika fitur aktif).
- [ ] **Dashboard** — Setelah login, sidebar dan topbar tampil; menu sesuai role (Superadmin vs Ranting/Cabang).

---

## 2. UKT (Ujian Kenaikan Tingkat)

- [ ] **Akses menu UKT** — Hanya level 2–5 (Ranting, Cabang, Pengprov, PP); level lain melihat pesan akses dibatasi.
- [ ] **Audit Ujian** — Ringkasan load; bisa pindah ke tab Pendaftaran / Riwayat.
- [ ] **Pendaftaran UKT** — Pilih tahun ajaran & ranting; pilih anggota; simpan; toast sukses.
- [ ] **Resume UKT** — Daftar peserta; verifikasi/tolak bukti; alasan tolak tampil; re-upload bukti untuk status ditolak.
- [ ] **Riwayat UKT** — Filter tahun/ranting; list riwayat tampil.
- [ ] **Cetak kwitansi** — Dari resume, cetak kwitansi; QR code dan data tampil.

---

## 3. Cetak Kwitansi (standalone)

- [ ] **URL dengan token** — Buka `/dashboard/print/kwitansi?token=...` (token valid dari API); halaman load, tombol cetak berfungsi.
- [ ] **Token tidak ada** — Tanpa `token` atau token invalid; pesan error tampil.

---

## 4. Lainnya (sanity)

- [ ] **Keanggotaan** — List/CRUD anggota (sesuai scope).
- [ ] **Pengaturan** — Tab Users / Menu / Roles; hanya Superadmin untuk Menu.
- [ ] **Profil** — Edit profil; pilih provinsi/kabupaten; simpan.
- [ ] **Wilayah** — Dropdown provinsi/kabupaten/kecamatan/desa load.

---

## Smoke (build + lint)

Tanpa browser, pastikan proyek build dan lint bersih:

```bash
npm run build
npm run lint
```

Atau gunakan script gabungan (jika ada):

```bash
npm run qa:smoke
```

---

## Catatan

- **Modul yang dihapus:** Siswa, Absensi, Penilaian, Jadwal, Organisasi, dan modul User (dead code) sudah tidak ada. Jika di database (tabel `menus`) masih ada baris dengan `key` = `siswa`, `absensi`, `penilaian`, `jadwal`, atau `organisasi`, hapus atau nonaktifkan baris tersebut agar link sidebar tidak 404.

---

*Terakhir diperbarui: modul Siswa dihapus; UKT akses level 2–5, verifikasi/tolak bukti.*
