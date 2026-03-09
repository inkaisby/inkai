/**
 * Tipe data kwitansi — dipakai di halaman display, PDF, dan API verify.
 */
export type KwitansiData = {
  id: string;
  token: string;
  no_kwitansi: string;
  nama: string;
  nomor: string;
  jenis: string;
  event: string;
  ranting: string;
  nominal: number;
  tanggal: string;
};

/** Kwitansi per ranting: A (total biaya kyu), B (potongan), C (hasil). */
export type KwitansiRantingData = {
  no_kwitansi: string;
  ranting_nama: string;
  jenis: string;
  event: string;
  total_peserta: number;
  potongan_per_peserta: number;
  A: number;
  B: number;
  C: number;
  tanggal: string;
  breakdown?: Array<{
    key: string;
    label: string;
    jumlah: number;
    biayaSatuan: number;
    subtotal: number;
  }>;
};
