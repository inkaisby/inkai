/**
 * Kriteria profil lengkap (sama dengan useCompletionScore): semua field wajib terisi + avatar.
 * Dipakai oleh /api/me dan /api/sidebar/menus.
 */
export const REQUIRED_PROFILE_FIELDS = [
  "nik",
  "nama",
  "email",
  "telepon",
  "jenis_kelamin",
  "tanggal_lahir",
  "nama_ayah",
  "nama_ibu",
  "pekerjaan_ortu",
  "alamat",
  "province_id",
  "regency_id",
  "district_id",
  "village_id",
  "ranting_id",
  "avatar_path",
] as const;

const FIELD_LABELS: Record<(typeof REQUIRED_PROFILE_FIELDS)[number], string> = {
  nik: "NIK",
  nama: "Nama",
  email: "Email",
  telepon: "Telepon",
  jenis_kelamin: "Jenis Kelamin",
  tanggal_lahir: "Tanggal Lahir",
  nama_ayah: "Nama Ayah",
  nama_ibu: "Nama Ibu",
  pekerjaan_ortu: "Pekerjaan Orang Tua",
  alamat: "Alamat",
  province_id: "Provinsi",
  regency_id: "Kabupaten/Kota",
  district_id: "Kecamatan",
  village_id: "Kelurahan/Desa",
  ranting_id: "Ranting",
  avatar_path: "Foto/Avatar",
};

function isFilled(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  return String(v).trim() !== "";
}

export function getProfileMissingLabels(row: Record<string, unknown> | null): string[] {
  if (!row) return REQUIRED_PROFILE_FIELDS.map((k) => FIELD_LABELS[k]);
  const missing: string[] = [];
  for (const key of REQUIRED_PROFILE_FIELDS) {
    if (!isFilled(row[key])) missing.push(FIELD_LABELS[key]);
  }
  return missing;
}

export function isProfileCompleted(row: Record<string, unknown> | null): boolean {
  if (!row) return false;
  return getProfileMissingLabels(row).length === 0;
}
