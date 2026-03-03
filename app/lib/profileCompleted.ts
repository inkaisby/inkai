/**
 * Kriteria profil lengkap (sama dengan useCompletionScore): semua field wajib terisi + avatar.
 * Dipakai oleh /api/me dan /api/sidebar/menus.
 */
export function isProfileCompleted(row: Record<string, unknown> | null): boolean {
  if (!row) return false;
  const required = [
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
  ];
  for (const key of required) {
    const v = row[key];
    if (v === null || v === undefined || String(v).trim() === "") return false;
  }
  return true;
}
