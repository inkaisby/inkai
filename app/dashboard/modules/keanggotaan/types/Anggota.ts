// app/dashboard/modules/keanggotaan/types/Anggota.ts

export type Ranting = {
  id: string;
  nama: string;
};

export type Anggota = {
  id: string;              // id row profiles
  user_id?: string;         // id auth user (UUID)
  nama: string;

  nomor?: string;          // nomor anggota (legacy / opsional)
  status?: string;         // AKTIF / NONAKTIF
  dan?: number | null;     // tingkat DAN

  ranting: Ranting;        // hasil JOIN dari ranting_id (WAJIB ADA)
  /** URL foto profil dari storage (avatar_path → getPublicUrl) */
  avatarUrl?: string | null;
};

export type KyuItem = {
  id: string;
  level: number;
  warna?: string;
  noIjazah?: string;
  tanggalIjazah?: string;
};

/** Bentuk data untuk list/table keanggotaan (ranting sebagai string). */
export type Keanggotaan = {
  id: string;
  nama: string;
  rantingNama: string;
  status?: string;
};
