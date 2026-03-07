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
   + QR Code → URL: /dashboard/print/kwitansi?token=...
           │
           ▼
   Unduh file: kwitansi-UKT-xxx.pdf
```

## 3. Halaman Cetak Ulang (dari scan QR)

```
┌─────────────────────────────────────────┐
│  /dashboard/print/kwitansi?token=xxx    │
├─────────────────────────────────────────┤
│  KWITANSI PEMBAYARAN                    │
│  No. UKT-xxxxxxxx                       │
│  Tanggal: ...                           │
│  Nama: ...                              │
│  Event: ... | Ranting: ...              │
│  Terbilang: Rp ...                      │
│                                         │
│  ┌─────────┐                            │
│  │  [QR]   │  Scan untuk cetak ulang    │
│  └─────────┘                            │
│                                         │
│  [ Cetak / Print ]                      │
└─────────────────────────────────────────┘
```

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
