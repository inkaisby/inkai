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
