# Penjelasan & Saran Pamungkas: Pendaftaran UKT (Dua Kolom)

## 1. Penjelasan bagian ini

Bagian yang Anda maksud adalah **dua panel** di halaman UKT:

### Kiri: Pendaftaran UKT
- **Tahun Ajaran** & **Ranting**: filter konteks (UKT mana, ranting mana).
- **Daftar anggota**: anggota aktif di ranting yang belum/belum tentu terdaftar di UKT tersebut.
- **Centang**: memilih anggota yang **akan** didaftarkan (belum tersimpan ke server).

### Kanan: Laporan Pendaftaran UKT
- **Ringkasan**: Total peserta (yang sudah tersimpan) + **(+N akan didaftarkan)** = anggota yang saat ini dicentang di kiri.
- **Tabel**:
  - Baris **sudah tersimpan**: dari API; kolom Status Bayar, Total, Bukti, Aksi (upload bukti, konfirmasi lunas) **aktif**.
  - Baris **pending** (hasil centang kiri): background amber, Status = "Menunggu simpan", Aksi = "Klik 'Daftarkan' di kolom kiri".

### Alur data
1. User centang anggota di kiri → state `pendingSelection` di parent ter-update → kanan menampilkan baris pending.
2. User klik **"Daftarkan X peserta"** di kiri → POST ke API → data tersimpan → `resumeVersion` naik → kanan refetch → baris pending hilang, muncul sebagai baris tersimpan dengan kolom aktif.

Jadi **centang = preview di kanan**; **Daftarkan = simpan ke DB** dan kanan menampilkan data riil dengan aksi upload bukti & konfirmasi lunas.

---

## 2. Saran pamungkas

### 2.1 UX
- **Tetap pertahankan** pola: centang = preview, tombol Daftarkan = commit. Jangan auto-save saat centang agar user bisa mengoreksi sebelum simpan.
- **Opsional:** Tambah tooltip di kolom kiri: *"Centang anggota lalu klik tombol 'Daftarkan X peserta' di bawah tabel untuk menyimpan."*
- **Opsional:** Setelah simpan berhasil, toast/banner singkat: *"X peserta berhasil didaftarkan. Upload bukti & konfirmasi lunas di kolom kanan."*

### 2.2 Data & state
- **pendingSelection** wajib ada di **parent** (AuditUjianModule / EventModule) dan di-pass ke PendaftaranUKT (`onSelectionChange`) dan ResumeUKT (`pendingSelection`). Jangan simpan hanya di salah satu child agar kanan dan kiri selalu sinkron.
- Pastikan **ResumeUKT** mendestructure `pendingSelection = []` di props agar tidak ReferenceError saat dipanggil tanpa prop.

### 2.3 Scope (cabang / ranting)
- Daftar tahun ajaran sudah difilter: **global + UKT cabang user**. Label **(Global)** / **(Cabang)** di dropdown sudah membantu.
- Ranting hanya bisa mendaftar ke UKT global atau UKT cabang tempat ranting bernaung (validasi di API pendaftaran).
- **Kelola UKT** (tab buat UKT cabang) hanya tampil untuk PP atau Ketua Cabang; cabang wajib isi tanggal & tempat.

### 2.4 Ringkas
| Aspek        | Rekomendasi |
|-------------|-------------|
| Alur        | Centang = preview kanan; Daftarkan = simpan; kolom kanan aktif setelah simpan. |
| State       | `pendingSelection` di parent; pass ke kiri (callback) dan kanan (prop). |
| UX          | Pertahankan dua langkah; tambah petunjuk/toast opsional. |
| Scope       | Filter tahun + validasi cabang di API; label Global/Cabang di UI. |

Dengan ini, bagian Pendaftaran UKT dua kolom tetap jelas, konsisten, dan aman per scope.

---

## 3. Cabang: Semua Ranting + Tabel Semua Ranting (Saran Pamungkas)

### 3.1 Ringkasan
Untuk **level 3–5** (Cabang, Pengprov, PP):
- **Dropdown Ranting** menampilkan opsi **"Semua Ranting"** di atas daftar ranting, plus **semua ranting** (bukan hanya scope).
- Saat **"Semua Ranting"** dipilih, **tabel** menampilkan **anggota aktif dari semua ranting** dengan kolom **Ranting** (nama ranting per baris).
- User bisa **cari** (nama, no. anggota, atau nama ranting), **centang**, dan **Daftarkan**; saat "Semua Ranting", ranting tiap peserta diambil dari data baris untuk POST.

### 3.2 Implementasi yang dipakai
| Aspek | Implementasi |
|-------|--------------|
| **API `/api/ranting`** | Level 3+ → `canSeeAllRanting`; daftar ranting tanpa filter scope. |
| **API `/api/ukt/anggota-aktif`** | `ranting_id=all` (hanya level 3+) → return semua profil dari semua ranting; tiap baris punya `ranting_id` & `ranting_nama`. |
| **API `/api/ukt/pendaftaran` GET** | Level 3+ → `canSeeAllRanting`; `ranting_id=all` → return semua pendaftaran (tanpa filter scope). |
| **PendaftaranUKT** | Opsi "Semua Ranting" di dropdown; fetch dengan `ranting_id=all`; tabel tambah kolom "Ranting" saat mode all; POST pakai `a.ranting_id` per peserta saat "Semua Ranting". |
| **Cari** | Filter juga by `ranting_nama` saat "Semua Ranting". |

### 3.3 Rekomendasi
- **Tetap** satu dropdown Ranting dengan opsi "Semua Ranting" + daftar ranting; tidak perlu dropdown terpisah.
- **Tetap** kolom Ranting hanya tampil saat "Semua Ranting" agar tabel satu ranting tetap ringkas.
- **Daftarkan** saat "Semua Ranting": pakai `ranting_id` dari tiap baris; jika tidak ada (edge case), tampilkan pesan dan skip peserta itu.
- **Level 2** (Ranting): hanya lihat ranting sendiri; tidak ada opsi "Semua Ranting".

---

## 4. Ringkasan: Yang Sudah Dilakukan untuk UKT

Bagian ini merangkum fitur dan perubahan yang telah diterapkan di modul UKT (Pendaftaran & Kelola).

### 4.1 Lokasi & struktur
- **Halaman:** `/dashboard/event` (tab Pendaftaran & Kelola UKT) dan `/dashboard/ukt` (AuditUjianModule, tab serupa).
- **Komponen utama:** `PendaftaranUKT.tsx`, `ResumeUKT`, `KelolaUKTCabang`, `RiwayatUKT`; API: `/api/ukt/tahun-ajaran`, `/api/ukt/pendaftaran`, `/api/ukt/anggota-aktif`, `/api/ranting`, dll.

### 4.2 Peran dan wewenang (yang sudah diimplementasi)

| Peran | Pendaftaran UKT | Kolom tabel | Aksi (Verifikasi/Tolak/Batal/Cetak) | Kelola UKT (buat/tutup tahun) |
|-------|----------------------------------|-------------|--------------------------------------|--------------------------------|
| **Superadmin** | Ya; bisa pilih Semua Ranting | Semua kolom | Ya | Ya (Buat UKT Global, tutup/buka tahun) |
| **PP (level 5)** | Ya; Semua Ranting + semua ranting | Semua kolom | Ya | Ya (Buat UKT Global) |
| **Cabang / level 3+** | Ya; opsi Semua Ranting, tabel semua ranting + kolom Ranting | Semua kolom | Ya (sesuai canConfirmLunas / canEditRefund) | Ya (tombol Kelola UKT → modal) |
| **Ketua Ranting (level 2)** | Ya; hanya ranting sendiri | Semua kolom (Status Bayar, Total, Bukti, Aksi) | **Cetak kwitansi** untuk baris Lunas; baris lain "Hanya Cabang/PP" | Tidak (tombol Kelola UKT tidak tampil) |

### 4.3 Fitur yang sudah dibangun
- **Filter:** Tahun Ajaran (global + cabang), Ranting (untuk level 3+: opsi "Semua Ranting"; default level 3+ = Semua Ranting).
- **Tabel Pendaftaran:** Daftar, Ranting (jika Semua Ranting), Nama, No. Anggota, Kyu/Dan, Status, Status Bayar, Total, Bukti, Aksi. Data pendaftaran di-fetch untuk semua role. Kolom Aksi: Ketua Ranting hanya tombol "Cetak kwitansi" untuk baris Lunas; Cabang/PP/Superadmin punya Verifikasi Lunas, Tolak, Cetak kwitansi, Batalkan ikut.
- **Kelola UKT:** Tombol "Kelola UKT" (ikon Settings2) di baris filter—tampil untuk Superadmin, PP, atau Cabang (`scope.cabang_ids` / `scope.is_pp` / `app_role === 'SUPERADMIN'`). Klik → modal berisi komponen `KelolaUKTCabang` (buat tahun ajaran global/cabang, tutup tahun, QRIS). Superadmin dan PP bisa akses penuh; sebelumnya hanya PP/Cabang.
- **API:** `GET/POST /api/ukt/tahun-ajaran` dan `PATCH /api/ukt/tahun-ajaran/[id]` mengizinkan Superadmin (`app_role === 'SUPERADMIN'`) setara PP untuk list dan create/update tahun ajaran.
- **Panel kanan:** Laporan Pendaftaran UKT (resume panel) telah dihapus dari EventModule dan AuditUjianModule; satu kolom (tabel kiri) saja.
- **Collapse default:** Grup "Sudah daftar" terbuka, "Belum daftar" dan "Batal" tertutup.
- **Realtime (opsional):** AuditUjianModule bisa subscribe ke `ukt_pendaftaran` dan refetch ringkasan + trigger refresh.
- **Responsif:** Overflow-x-auto, padding, min-width tabel dan full width panel disesuaikan.

### 4.4 Alur singkat
1. User pilih Tahun Ajaran dan Ranting (atau Semua Ranting untuk level 3+).
2. Tabel menampilkan anggota aktif; centang yang akan didaftarkan → klik "Daftarkan X peserta" → POST → data tersimpan.
3. Baris "Sudah daftar" menampilkan Status Bayar, Total, Bukti; untuk Cabang/PP/Superadmin kolom Aksi berisi Verifikasi Lunas, Tolak, Cetak kwitansi, Batalkan ikut (modal Tolak/Batal + refetch setelah aksi).
4. Kelola UKT (jika akses): buat tahun ajaran global/cabang, set biaya per kyu, tutup tahun; setelah create → refetch daftar tahun ajaran dan optional callback `onRegistrationSuccess`.

---

## 5. Saran Pamungkas Terbaru

### 5.1 Konsistensi role dan scope
- **Superadmin** sudah diperlakukan setara PP di frontend (Kelola UKT) dan backend (tahun-ajaran GET/POST/PATCH). Pertahankan pola: cek `app_role === 'SUPERADMIN'` di API untuk fitur yang boleh diakses PP.
- **Ketua Ranting:** Kolom tabel lengkap; untuk baris Lunas bisa cetak kwitansi; untuk baris lain kolom Aksi menampilkan "Hanya Cabang/PP".

### 5.2 UX dan dokumentasi
- **Tooltip/petunjuk:** Opsional tambah tooltip di area filter: *"Centang anggota lalu klik 'Daftarkan X peserta' untuk menyimpan. Aksi verifikasi/tolak/batal hanya untuk Cabang/PP."*
- **QA:** Gunakan `docs/QA-CHECKLIST.md` dan `docs/SUPABASE-CHECK.md` untuk cek konfigurasi Supabase (realtime, RLS) dan skenario per role (Ranting vs Cabang vs PP vs Superadmin).

### 5.3 Keamanan dan maintenance
- **API:** Semua endpoint UKT yang mengubah data (POST/PATCH) sudah membatasi akses per scope/role; pertahankan pengecekan `getUserScope` + `app_role`/structural level.
- **Realtime:** Jika pakai subscribe `ukt_pendaftaran`, pastikan Supabase project punya realtime enabled untuk tabel tersebut dan RLS konsisten (lihat `docs/SUPABASE-CHECK.md`).

### 5.4 Ringkas
| Aspek | Saran |
|-------|--------|
| Role | Superadmin = PP untuk Kelola UKT; Ketua Ranting: cetak kwitansi untuk baris Lunas, aksi lain "Hanya Cabang/PP". |
| UX | Satu kolom tabel; centang → Daftarkan; toast "X peserta didaftarkan."; teks bantuan "Ranting: daftar & cetak kwitansi jika Lunas. Cabang: verifikasi & refund." |
| API | Tetap filter tahun (global + cabang) dan validasi ranting/cabang; Superadmin diizinkan di GET/POST/PATCH tahun-ajaran. |
| Docs | Pakai QA-CHECKLIST dan SUPABASE-CHECK; update MODULES.md jika ada penambahan route/komponen UKT. |

Dengan ini, UKT (Pendaftaran & Kelola) punya penjelasan tunggal dan saran pamungkas yang selaras dengan implementasi terbaru.

---

## 6. Alur UKT per peran (tanpa kode)

Deskripsi alur dari sisi **Ketua Ranting** dan **Ketua Cabang**, tanpa rujukan kode.

### 6.1 Ketua Ranting

1. **Mendaftarkan anggota**  
   Memilih tahun ajaran dan ranting, centang anggota yang akan ikut UKT, lalu klik "Daftarkan X peserta". Data tersimpan; baris muncul di tabel dengan status "Sudah daftar".

2. **Pembayaran**  
   Satu atau beberapa anggota membayar sesuai nominal UKT. Dua opsi:
   - **Upload bukti transfer:** peserta/ranting upload bukti transfer (TF); atau
   - **QRIS:** sistem (atau cabang) membuatkan QRIS; peserta bayar lalu bukti bisa di-upload atau tercatat otomatis.

3. **Konfirmasi bayar**  
   Ketua Ranting (atau yang berwenang di ranting) melakukan konfirmasi bayar: mengisi/mengonfirmasi bahwa pembayaran sudah dilakukan sehingga status di tabel bergerak ke tahap menunggu verifikasi atau lunas (sesuai desain sistem).

4. **Anggota batal ikut UKT**  
   Jika ada anggota yang batal ikut UKT, ada **aksi alasan batal**: user pilih baris peserta tersebut dan mengisi alasan batal. Status peserta berubah menjadi batal; cabang nanti bisa mengurus pengembalian dana jika ada.

### 6.2 Ketua Cabang (di tabel UKT, kolom Aksi)

1. **Validasi pembayaran**  
   Di akun Ketua Cabang, tabel UKT menampilkan semua peserta (ranting di bawah cabang). Di kolom **Aksi**, cabang melakukan **validasi** bukti bayar.

2. **Jika valid → Lunas ke ranting**  
   Jika bukti valid, cabang memberi keterangan **Lunas** (status bayar = lunas, sudah diverifikasi). Ranting dan peserta melihat status Lunas di tabel mereka.

3. **Jika ada anggota batal → pengembalian dana dan aksi refund**  
   Untuk peserta yang sudah dibatalkan (aksi alasan batal dari ranting), cabang:
   - Mengembalikan dana yang sudah dibayarkan (sesuai prosedur);
   - Di kolom aksi/refund, **mengubah status refund**: mis. "Tidak ada pengembalian", "Pending (akan dikembalikan)", "Sudah dikembalikan", plus nominal dan catatan/bukti pengembalian jika ada.

### 6.3 Kwitansi: Cabang membuatkan, Ketua Ranting cetak manual (QR Code)

- **Cabang membuatkan kwitansi:** Setelah Cabang memvalidasi bukti bayar dan memberi status **Lunas**, sistem memastikan kwitansi untuk peserta tersebut siap (token kwitansi dibuat/dijamin). Cabang bisa mencetak kwitansi untuk keperluan arsip/bendahara.
- **Ketua Ranting mencetak manual:** Setelah status Lunas dari Cabang, **Ketua Ranting bisa mencetak kwitansi secara manual** dari tabel UKT (tombol "Cetak kwitansi" untuk baris yang sudah Lunas). Kwitansi yang sudah pernah kita buat memakai **QR Code**: di kwitansi tercantum QR yang mengarah ke URL cetak ulang (`/dashboard/print/kwitansi?token=...`), sehingga siapa pun (termasuk Ranting atau peserta) bisa scan QR dan mencetak ulang atau memverifikasi kwitansi.

**Ringkas:** Cabang bertanggung jawab memvalidasi dan "membuatkan" kwitansi (status Lunas + token); Ketua Ranting (dan pihak lain) bisa **mencetak manual** kwitansi tersebut; QR Code di kwitansi mendukung verifikasi dan cetak ulang.

---

## 7. Saran pamungkas: tabel satu kolom lebih informatif

Karena tabel Pendaftaran UKT sekarang **satu tabel** (tanpa panel kanan terpisah), semua informasi status bayar, total, bukti, dan aksi tampil dalam satu tempat. Saran pamungkas:

### 7.1 Kelebihan tabel tunggal
- **Satu sumber benar:** Semua status (Sudah daftar, Status Bayar, Total, Bukti, Aksi) terlihat per baris; tidak perlu bolak-balik kiri–kanan.
- **Lebih informatif:** Ketua Ranting melihat Status Bayar, Total, Bukti meskipun aksi verifikasi/tolak/refund hanya untuk Cabang/PP—transparansi tanpa mengizinkan aksi yang bukan wewenangnya.
- **Alur jelas:** Urutan kolom (Daftar → … → Status Bayar → Total → Bukti → Aksi) mengikuti alur: daftar → bayar → bukti → validasi/refund.

### 7.2 Yang perlu dipertahankan
- **Kolom sama untuk semua role;** isi Aksi: Ranting = "Cetak kwitansi" untuk baris Lunas, "Hanya Cabang/PP" untuk lain; Cabang/PP = Verifikasi Lunas, Tolak, Cetak kwitansi, Batalkan ikut, isian refund.
- **Satu langkah simpan:** Centang → "Daftarkan X peserta" → simpan; tidak auto-save agar user bisa koreksi sebelum commit.
- **Refund hanya Cabang/PP:** Alasan batal bisa dari Ranting; pengembalian dana dan status refund (pending/dikembalikan) diisi oleh Cabang di aksi "Batalkan ikut" atau halaman riwayat.

### 7.3 Rekomendasi ringkas
| Aspek | Saran |
|-------|--------|
| Tabel | Pertahankan satu tabel dengan semua kolom (termasuk Status Bayar, Total, Bukti, Aksi); batasi hanya isi Aksi per role. |
| Alur Ranting | Daftar → pembayaran (upload bukti TF atau QRIS) → konfirmasi bayar → jika batal: aksi alasan batal. |
| Alur Cabang | Validasi di kolom Aksi → jika valid: Lunas ke ranting; jika peserta batal: kembalikan dana dan ubah aksi/status refund. |
| Kwitansi | Cabang membuatkan kwitansi (setelah Lunas); Ketua Ranting bisa mencetak manual; kwitansi memakai QR Code untuk verifikasi/cetak ulang. |
| Informasi | Tabel tunggal = satu tempat baca status; tambah tooltip/keterangan singkat di atas tabel jika perlu (peran siapa boleh apa). |

Dengan ini, dokumentasi alur UKT (tanpa kode), alur kwitansi (Cabang membuatkan, Ranting cetak manual + QR Code), dan saran pamungkas untuk tabel satu kolom yang lebih informatif tercatat jelas.
