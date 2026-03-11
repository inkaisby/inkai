# Keputusan: Pembayaran UKT & QRIS

Dokumen ini mencatat keputusan arah pembayaran UKT (Ujian Kenaikan Tingkat) dan penggunaan QRIS di inkai-app.

---

## Saran pamungkas (disetujui)

1. **Fase sekarang:** Pakai **QRIS statis** + **upload bukti** + verifikasi manual (Bendahara/Cabang). Tidak pakai payment gateway dulu.
2. **Fase nanti:** Tambah **QRIS dinamis** (satu transaksi = satu pendaftaran dulu), lalu opsi "bayar sekaligus" banyak anggota bila siap.
3. **Data & keamanan:** Simpan transaksi + relasi di DB; webhook divalidasi dan idempotent.

---

## Fase 1: QRIS statis (saat ini)

- Satu QR per tahun ajaran UKT (atau per Cabang), dari field `qris_content` di Kelola UKT.
- User scan QR dengan aplikasi berlogo QRIS → transfer sesuai nominal → **wajib upload bukti** di pendaftaran masing-masing.
- Verifikasi tetap manual: Bendahara/Cabang verifikasi bukti → status Lunas.
- Tampilan di app: blok "Bayar via QRIS" dengan teks jelas bahwa setelah transfer harus **upload bukti** di pendaftaran.

---

## Fase 2: QRIS dinamis (rencana)

- Integrasi payment gateway (Midtrans, Xendit, dll.) untuk generate QR per transaksi.
- **Tahap awal:** Satu QR = satu pendaftaran UKT. User pilih "Bayar dengan QRIS" → dapat QR + nominal → bayar → webhook → status otomatis Lunas.
- **Tahap lanjut:** Opsi "bayar sekaligus" (satu transfer untuk banyak anggota); satu transaksi ↔ banyak `ukt_pendaftaran`.

### Data di DB (saat implementasi nanti)

- Tabel **transaksi pembayaran:** `order_id`, amount, status, `paid_at`, relasi ke gateway.
- Tabel **detail transaksi–pendaftaran:** menghubungkan satu transaksi ke satu atau banyak `ukt_pendaftaran`.
- Kolom di `ukt_pendaftaran`: `payment_transaction_id`, `payment_method` (manual_upload / qris_gateway).

### Alur singkat

1. User minta QR → backend create transaksi + panggil gateway → tampilkan QR.
2. User bayar di bank/e-wallet.
3. Gateway kirim webhook → backend verifikasi signature → update transaksi + update status pendaftaran jadi Lunas (idempotent).

---

## Referensi diskusi

- Pola bayar satuan vs sekaligus: diskusi "pola agar bisa bayar sekaligus beberapa anggota atau satuan".
- Opsi A (statis) vs C (dinamis): dipilih C untuk fase nanti, dengan rekomendasi mulai statis dulu.
- Uraian lengkap data DB dan alur API + webhook: ada di percakapan desain "data apa saja yang perlu disimpan di DB dan alur API + webhook step-by-step".

---

*Terakhir diperbarui: mengikuti kesepakatan "saya setuju saran pamungkas".*
