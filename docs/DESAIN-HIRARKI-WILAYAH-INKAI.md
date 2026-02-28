# Desain: inkai-app Sesuai Hirarki INKAI (Wilayah & Scope)

Dokumen ini menjabarkan cara menyejajarkan inkai-app dengan hirarki organisasi INKAI yang sudah didiskusikan: **Kohai → Ranting → Cabang → Provinsi → Pengurus Pusat**, dengan **satu akun multi jabatan multi wilayah** dan **visibilitas berdasarkan scope** (Ketua Ranting / Cabang / Pengprov / PP).

---

## 1. Target hirarki (ringkas)

| Level | Jabatan (contoh) | Scope visibilitas |
|-------|------------------|-------------------|
| 1 | Kohai (anggota biasa) | Hanya data diri / ranting tempat dia anggota |
| 2 | Ketua/Sekretaris/Bendahara **Ranting** | Satu atau banyak Ranting yang jadi tanggung jawabnya |
| 3 | Ketua/Sekretaris/Bendahara **Cabang** | Satu Cabang + **semua Ranting di bawah cabang itu** |
| 4 | Ketua/Sekretaris/Bendahara **Pengprov** | Satu Provinsi + **semua Cabang & Ranting di provinsi itu** |
| 5 | Ketua/Sekretaris/Bendahara **PP** | **Semua** Provinsi, Cabang, Ranting |

Aturan:

- Satu email bisa punya **banyak jabatan** (mis. Kohai di Ranting A, Ketua Ranting di Ranting B, Bendahara Cabang di Cabang X).
- Setiap jabatan terikat ke **satu organisasi/wilayah** (Ranting X, Cabang Y, Provinsi Z).
- **Melihat data** = menurut scope jabatan tertinggi yang relevan (atau gabungan scope semua jabatan user).

---

## 2. Keadaan saat ini di codebase

- **Tabel `ranting`**: ada; kolom yang dipakai di API: `id`, `nama`, `aktif`. **Belum ada** kolom parent (cabang_id / provinsi_id). Ranting masih **flat** (tidak terhubung ke Cabang/Provinsi).
- **Cabang / Provinsi organisasi**: **belum ada** tabel cabang atau provinsi sebagai entitas organisasi. Yang ada: referensi wilayah (provinces, regencies, districts, villages) untuk alamat/lokasi.
- **profiles**: ada `ranting_id`, `structural_level`, `app_role`. Beberapa RLS memakai `structural_level = 4` (Pengprov). Belum ada konsep "jabatan per organisasi".
- **user_structural_roles**: menyimpan multi jabatan (role dari structural_role_master), ada `active`. **Belum ada** kolom organisasi (ranting_id / cabang_id / provinsi_id) — jabatan belum "di Ranting/Cabang mana".
- **canAccess**: pakai `structural_level` (angka) untuk menu; belum pakai "scope wilayah" untuk filter data (keanggotaan, siswa, dll.).
- **API data (keanggotaan, ranting list, dll.)**: belum memfilter menurut scope (Ketua Cabang hanya lihat ranting di bawah cabangnya, dll.).

---

## 3. Target model data (konsep)

### 3.1 Hierarki organisasi (wilayah)

Perlu satu hierarki jelas: **Provinsi (org) → Cabang (org) → Ranting (org)**.

- **Opsi A – Tabel terpisah**  
  - `organisations` atau `provinsi` (level tertinggi, bisa pakai wilayah provinsi_id).  
  - `cabang`: punya `provinsi_id` (atau organisation_id).  
  - `ranting`: sudah ada; tambah `cabang_id`.  
  Relasi: Provinsi 1–N Cabang, Cabang 1–N Ranting.

- **Opsi B – Satu tabel organisasi**  
  - Satu tabel `organisations` dengan `type` (provinsi / cabang / ranting) dan `parent_id` (nullable).  
  - Ranting = organisasi type ranting, parent = cabang; Cabang = type cabang, parent = provinsi; Provinsi = type provinsi, parent null.  
  - Bisa tetap link ke wilayah (province_id, regency_id, dll.) untuk keperluan alamat/tampilan.

Rekomendasi: **Opsi A** lebih mudah dibaca dan cocok dengan istilah INKAI (Ranting/Cabang/Provinsi). Tabel `ranting` tetap; tambah `cabang` dan `provinsi` (atau pakai satu tabel `cabang` + satu tabel `provinsi`), lalu **ranting.cabang_id**, **cabang.provinsi_id**.

### 3.2 User ↔ jabatan per organisasi

Agar satu akun bisa "Ketua Ranting di banyak ranting" dan "Ketua Cabang di satu cabang":

- Setiap **penugasan jabatan** = satu baris: (user_id, role, organisasi_id atau ranting_id/cabang_id/provinsi_id).
- Role bisa dari `structural_role_master` (KETUA_RANTING, KETUA_CABANG, …). Organisasi bisa ranting_id, cabang_id, atau provinsi_id tergantung level role.

Implikasi:

- **user_structural_roles** (atau tabel baru "user_structural_assignments") perlu kolom **organisasi**: mis. `ranting_id`, `cabang_id`, `provinsi_id` (tiga nullable; yang diisi sesuai level jabatan). Satu baris = "user X punya jabatan Y **di** organisasi Z".
- **Kohai**: bisa tetap "anggota" di suatu ranting (mis. lewat profiles.ranting_id atau tabel keanggotaan_ranting) tanpa perlu baris jabatan struktural; atau tetap satu baris role KOHAL dengan ranting_id.

### 3.3 Scope visibilitas (siapa lihat data mana)

- **PP (level 5)**: lihat semua provinsi, cabang, ranting → tidak filter by org.
- **Pengprov (level 4)**: lihat satu provinsi + cabang + ranting di bawahnya → filter: `provinsi_id = provinsi_id_user` (dan turunannya).
- **Ketua Cabang (level 3)**: lihat satu cabang + ranting di bawahnya → filter: `cabang_id = cabang_id_user` (dan ranting di cabang itu).
- **Ketua Ranting (level 2)**: lihat ranting yang jadi tanggung jawabnya → filter: `ranting_id IN (list_ranting_user)`.
- **Kohai (level 1)**: lihat terbatas (diri sendiri / ranting sendiri).

Cara teknis:

- Saat login / load session: hitung **scope** user (mis. list_ranting_id, list_cabang_id, provinsi_id, atau flag "all"). Bisa dari gabungan semua baris user_structural_roles + organisasi.
- Setiap API yang mengembalikan data per wilayah (keanggotaan, siswa, ranting, laporan): terima atau baca scope ini, lalu **filter** (WHERE ranting_id IN …, atau cabang_id IN …, atau provinsi_id = …).

---

## 4. Rencana implementasi (fase)

### Fase 1: Hierarki organisasi di database

- Definisikan dan buat tabel **provinsi** (organisasi) dan **cabang** (organisasi) jika belum ada; atau satu tabel **organisations** dengan type + parent_id.
- Tambah kolom **ranting.cabang_id** (FK ke cabang). Tambah **cabang.provinsi_id** jika pakai tabel cabang.
- Migrasi data: ranting yang sudah ada bisa sementara cabang_id null, atau assign ke cabang default per wilayah (regency/district) jika ada mapping.
- API: endpoint baca hierarki (daftar provinsi, cabang per provinsi, ranting per cabang) untuk dropdown dan navigasi.

### Fase 2: Jabatan terikat organisasi

- Ubah atau perluas **user_structural_roles** (atau buat tabel assignasi) agar setiap baris punya **organisasi** (ranting_id / cabang_id / provinsi_id).
- UI Settings: saat assign "Ketua Ranting" / "Ketua Cabang" / "Pengprov", pilih **organisasi** (ranting/cabang/provinsi mana). Satu user bisa banyak baris (banyak ranting, atau satu cabang + banyak ranting).
- Backend: fungsi "dapat scope user" (ranting_ids, cabang_ids, provinsi_id, is_pp) dari user_structural_roles + organisasi.

### Fase 3: Scope di session dan API

- Session / context: setelah login, hitung dan simpan **scope** (mis. di API /api/me atau /api/sidebar/menus): list_ranting_id, list_cabang_id, provinsi_id, is_pp.
- API yang menampilkan data per wilayah (keanggotaan, daftar ranting, siswa, dll.): baca scope; terapkan filter WHERE sesuai level (PP = no filter, Pengprov = by provinsi_id, Ketua Cabang = by cabang_id, Ketua Ranting = by ranting_id IN …).
- RLS (jika dipakai untuk tabel tersebut): sesuaikan dengan scope (bisa pakai helper function yang return allowed ranting_id / cabang_id / provinsi_id untuk auth.uid()).

### Fase 4: UI konteks dan konsistensi

- Topbar / konteks: jika user punya banyak ranting atau banyak cabang, bisa pilih "sedang mengurus: Ranting A / Cabang X" (opsional), atau tampilkan gabungan data sesuai scope.
- Menu dan canAccess: tetap pakai structural_level untuk **menu**; filter **data** pakai scope (fase 3).
- Daftar ranting di dropdown/form: filter menurut scope (Ketua Cabang hanya lihat ranting di cabangnya; Pengprov lihat ranting di provinsinya; PP lihat semua).

---

## 5. Ringkasan

- **Hirarki**: Provinsi → Cabang → Ranting (masing-masing entitas organisasi; ranting punya cabang_id, cabang punya provinsi_id).
- **Multi akun**: Satu user punya banyak baris (jabatan, organisasi); setiap baris = jabatan di **satu** organisasi.
- **Melihat data**: Ketua Ranting = ranting yang dia pimpin; Ketua Cabang = satu cabang + semua ranting di bawahnya; Pengprov = satu provinsi + semua cabang & ranting di bawahnya; PP = semua.
- **Langkah**: (1) Tambah hierarki organisasi di DB + link ranting–cabang–provinsi; (2) Jabatan user terikat organisasi; (3) Scope di session + filter di API (dan RLS); (4) UI konteks dan daftar yang filter by scope.

Dokumen ini bisa dipakai sebagai acuan tetap; implementasi bisa dilakukan bertahap per fase di atas.

---

## 6. Status implementasi (ringkas)

| Fase | Item | Status |
|------|------|--------|
| 1 | Migrasi provinsi, cabang, ranting.cabang_id | ✅ |
| 1 | API GET /api/provinsi, /api/cabang, /api/ranting, /api/wilayah/hierarchy | ✅ |
| 2 | user_structural_roles + ranting_id, cabang_id, provinsi_id | ✅ |
| 2 | RPC get_user_structural_roles (dengan org), add_user_structural_role (dengan org) | ✅ |
| 2 | getUserScope(), scope di /api/me dan /api/sidebar/menus | ✅ |
| 2 | RoleManagementPanel: pilih organisasi saat tambah jabatan | ✅ |
| 3 | Filter GET ranting, cabang, provinsi, hierarchy by scope | ✅ |
| 4 | ScopeContext + dropdown konteks di topbar | ✅ |
| 4 | Form ranting/cabang pakai API (sudah terfilter) | ✅ |
| - | GET /api/users: filter by scope + ?context_ranting_id= | ✅ |
| - | GET /api/ranting, /api/cabang: ?context_ranting_id=, ?context_cabang_id= | ✅ |
| - | Settings → Daftar user (EmailList) pakai API + scope + konteks | ✅ |
