# Wireframe — UKT & Kwitansi

## 1. Halaman UKT (Pendaftaran & Kelola UKT)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ UKT | Institut Karate-Do Indonesia                    [🔔] Jonatan K. - Ketua Cabang │
├─────────────────────────────────────────────────────────────────────────────────┤
│ ← Kembali ke Dashboard                                                             │
│                                                                                   │
│ UKT (Ujian Kenaikan Tingkat)                                                       │
│ Ringkasan UKT, peserta, dan hasil...                                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│ [ Pendaftaran & Kelola UKT ]  [ Ringkasan ]                                        │
├──────────────────────────────────────────────┬────────────────────────────────────┤
│                                              │                                    │
│ ▼ Kelola UKT                                 │  Laporan Pendaftaran UKT            │
│   Atur tahun ajaran, biaya, tutup tahun      │  Ringkasan peserta: upload bukti   │
│                                              │  & konfirmasi lunas                 │
│ ─────────────────────────────────────────── │ ─────────────────────────────────── │
│ Pendaftaran UKT                               │                                    │
│ Pilih tahun ajaran dan ranting...             │  Ranting: Airlangga — Tahun: II/2026│
│                                              │  Total: 0 | Belum bayar: 0 | Lunas: 0│
│ Tahun Ajaran: [ II / 2026 (Global) ▼ ]       │                                    │
│ Ranting:      [ Airlangga ▼ ]                │  ┌──────┬─────┬─────┬──────────┬─────┬─────┬────────────────────┐
│                                              │  │Peserta│No   │Kyu  │Status    │Total│Bukti│ Aksi                │
│ Cari anggota: [ Ketik untuk filter... ]      │  │      │Angg. │Dan  │Bayar     │     │     │ ✓ Lunas             │
│                                              │  ├──────┼─────┼─────┼──────────┼─────┼─────┤ [Cetak kwitansi]    │
│ ┌──────┬──────┬─────┬─────┬────────┐        │  │ ...  │ ... │ ... │ Lunas    │ ... │ ... │ [Batalkan ikut]     │
│ │Daftar│ Nama │No   │Kyu  │ Status │        │  └──────┴─────┴─────┴──────────┴─────┴─────┴────────────────────┘
│ │  ☐   │ ...  │ ... │ ... │        │        │                                    │
│ └──────┴──────┴─────┴─────┴────────┘        │  Belum ada peserta / (isi tabel)   │
│                                              │                                    │
│ Tidak ada anggota aktif di ranting ini.      │                                    │
└──────────────────────────────────────────────┴────────────────────────────────────┘
```

### Peran Ketua Ranting vs Cabang (tanpa mengubah tampilan)

**Tampilan dan layout halaman ini sama** untuk Ketua Ranting dan Ketua Cabang. Yang berbeda hanya **scope data** dan **siapa boleh melakukan aksi apa**:

| Aspek | Ketua Ranting | Ketua Cabang |
|--------|----------------|--------------|
| **Tampilan** | Sama (dua kolom: Pendaftaran + Laporan) | Sama |
| **Dropdown Ranting** | Hanya ranting sendiri (biasanya satu) | Semua ranting di bawah cabang |
| **Kolom kiri** | Daftar anggota ranting sendiri, centang & daftarkan peserta UKT | Bisa pilih ranting → lihat daftar anggota ranting itu (untuk laporan) |
| **Kolom kanan** | Laporan peserta UKT ranting sendiri | **Laporan dari ranting yang dipilih** — Cabang hanya menerima/melihat laporan ini |
| **Upload bukti** | Ya (untuk peserta rantingnya) | Bisa (untuk peserta ranting yang dipilih) |
| **Verifikasi & Konfirmasi Lunas** | Tergantung kebijakan: bisa di Ranting atau hanya Cabang | Biasanya Cabang yang verifikasi bukti dan set lunas |
| **Cetak kwitansi** | Jika ia boleh lihat baris lunas (setelah Cabang konfirmasi) → tombol Cetak kwitansi | Setelah verifikasi lunas → Cabang bisa cetak kwitansi untuk keperluan bendahara/arsip |

**Kesimpulan:** Wireframe **tidak mengubah tampilan** di sisi Ketua Ranting. Halaman tetap satu: Pendaftaran UKT (kiri) + Laporan Pendaftaran UKT (kanan). Cabang memakai **tampilan yang sama** hanya untuk **menerima laporan** (pilih ranting → lihat tabel kanan) dan melakukan verifikasi lunas / cetak kwitansi sesuai wewenang. Implementasi aksi per role (siapa bisa verifikasi lunas, siapa bisa cetak) diatur di backend (scope) dan opsional di frontend (sembunyikan tombol jika role tidak boleh).

## 2. Alur Kwitansi (Cetak)

```
[ Laporan UKT: baris peserta Lunas ]
           │
           ▼
   [ Tombol "Cetak kwitansi" ]
           │
           ├──► (jika belum punya token) POST ensure-kwitansi-token
           │
           ▼
   GET /api/kwitansi/verify?token=...
           │
           ▼
   Generate PDF (no, tanggal, nama, event, nominal, ranting)
   + QR Code → URL: /kwitansi?token=...
           │
           ▼
   Unduh file: kwitansi-UKT-xxx.pdf
```

## 2b. Alur Scan QR → Cetak Ulang (Bendahara / User)

```
  Bendahara membuka link kwitansi (atau modul UKT)
           │
           ▼
  [ Scan QR Kwitansi ] di aplikasi
           │
           ▼
  Alat (kamera) di aplikasi memindai QR code di kwitansi
           │
           ▼
  Aplikasi membaca data QR → URL: /kwitansi?token=xxx
           │
           ▼
  Halaman kwitansi terbuka (data dari API)
           │
           ▼
  Bendahara atau user → [ Cetak / Print ]
```

**Ringkas:** Bendahara buka aplikasi → pilih "Scan QR Kwitansi" → arahkan kamera ke QR di kwitansi fisik → aplikasi baca data QR dan buka halaman kwitansi → tinggal print.

## 3. Cetak Kwitansi Tanpa Login

### 3a. Alur Masuk (tanpa login)

```
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │  CARA DAPAT LINK KWITANSI (tanpa perlu login)                                │
  ├─────────────────────────────────────────────────────────────────────────────┤
  │                                                                              │
  │  1. SCAN QR di kwitansi fisik                                                │
  │     ┌────────────┐                                                            │
  │     │  [QR Code] │  →  URL: https://.../kwitansi?token=xxx                    │
  │     └────────────┘     Buka di browser → langsung ke halaman kwitansi         │
  │                                                                              │
  │  2. TEMPEL LINK (dari share, WhatsApp, email)                                │
  │     [ https://.../kwitansi?token=xxx                    ] [ Buka ]           │
  │                                                                              │
  │  3. INPUT NO. KWITANSI (jika URL macet)                                      │
  │     [ UKT-A23F0323                           ] [ Buka ]                      │
  │     → API /api/kwitansi/by-number?no=UKT-A23F0323                            │
  │     → dapat token → redirect ke /kwitansi?token=xxx                          │
  │                                                                              │
  └─────────────────────────────────────────────────────────────────────────────┘
```

### 3b. Diagram Alur

```
  User dapat link (QR / tempel / no. kwitansi)
           │
           ▼
  Buka URL: /kwitansi?token=xxx
           │
           ├──► (tanpa login) ──► Halaman kwitansi publik
           │
           ▼
  GET /api/kwitansi/verify?token=xxx  (tidak cek session)
           │
           ├──► 200: data kwitansi keluar
           │         │
           │         ▼
           │    [ Tampilkan kwitansi ] + [ Cetak / Print ]
           │
           └──► 404: "Kwitansi tidak ditemukan" + link Ke UKT
```

### 3c. Wireframe Halaman Kwitansi (shortcut — tanpa login)

```
┌─────────────────────────────────────────────────────────────────┐
│  /kwitansi?token=xxx                    (tanpa header dashboard)   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  KWITANSI PEMBAYARAN                                             │
│  No. UKT-A23F0323                                                │
│  Tanggal: 6 Mar 2026                                             │
│                                                                  │
│  Sudah terima dari : **Nama Peserta**                            │
│  No. Anggota : 12345                                             │
│  Ranting : Airlangga                                             │
│  Untuk pembayaran : Ujian Kenaikan Tingkat (UKT) — II/2026       │
│  Sejumlah : **Rp 345.000**                                       │
│                                                                  │
│  ┌─────────────┐                    Petugas,                     │
│  │  [QR Code]  │                    _______________               │
│  │  Scan untuk │                    (tanda tangan)               │
│  │  cetak ulang│                                                    │
│  └─────────────┘                                                    │
│                                                                  │
│  [ Kembali ke UKT ]  [ Cetak / Print ]                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3d. Perilaku & State

| State | Tampilan |
|-------|----------|
| **Loading** | "Memuat kwitansi…" (teks tengah) |
| **Error** (token invalid / tidak ada) | Pesan error merah + link "Ke UKT" |
| **Sukses** | Kwitansi lengkap + tombol Cetak / Print |

**Catatan:** Tidak ada header/topbar dashboard. Halaman bersih untuk cetak. Tombol "Kembali ke UKT" mengarah ke `/dashboard/ukt`; jika user belum login, akan diarahkan ke halaman login.

## 4. Modul Keuangan (daftar & cetak kwitansi)

```
┌─────────────────────────────────────────────────────────────────┐
│ Kwitansi Pembayaran                                              │
│ Data pembayaran lunas UKT. Cetak kwitansi dengan QR.             │
├─────────────────────────────────────────────────────────────────┤
│ Filter tahun ajaran: [ Semua tahun ▼ ]                           │
├─────────────────────────────────────────────────────────────────┤
│ Tanggal   │ Nama        │ Event / Ranting   │ Nominal  │ Aksi   │
│ ---------│-------------│-------------------│----------│--------│
│ ...      │ ...         │ ...               │ Rp ...   │ [Cetak]│
└─────────────────────────────────────────────────────────────────┘
```

---

*File wireframe visual: `assets/wireframe-ukt-dashboard.png`*
