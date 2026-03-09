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
