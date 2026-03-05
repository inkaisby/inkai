/**
 * Helper upload file ijazah/sertifikat ke bucket ijazah.
 * Dipakai oleh API keanggotaan/riwayat (kyu, dan, pelatihan).
 */
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";

export const BUCKET_IJAZAH = "ijazah";
export const MAX_SIZE_BYTES = 1 * 1024 * 1024; // 1MB
export const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
];

export function getAllowedExtensions(): string[] {
  return ["pdf", "jpeg", "jpg", "png"];
}

export function getPublicUrl(filePath: string | null): string | null {
  if (!filePath) return null;
  const admin = createSupabaseAdminClient();
  const { data } = admin.storage.from(BUCKET_IJAZAH).getPublicUrl(filePath);
  return data?.publicUrl ?? null;
}

/**
 * Upload file ke bucket ijazah. Path: {userId}/{folder}/{recordId}.{ext}
 * Returns storage path on success.
 */
export async function uploadIjazah(
  userId: string,
  folder: "kyu" | "dan" | "pelatihan",
  recordId: string,
  file: File
): Promise<{ path: string } | { error: string }> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Tipe file harus PDF atau gambar (JPG, PNG)." };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { error: "Ukuran file maksimal 1 MB." };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
  const safeExt = getAllowedExtensions().includes(ext) ? ext : "pdf";
  const filePath = `${userId}/${folder}/${recordId}.${safeExt}`;

  const admin = createSupabaseAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await admin.storage
    .from(BUCKET_IJAZAH)
    .upload(filePath, buffer, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: true,
    });

  if (error) return { error: error.message || "Gagal mengunggah file" };
  return { path: filePath };
}

const UKT_BUKTI_FOLDER = "ukt_bukti";

/**
 * Upload bukti transfer UKT ke bucket ijazah. Path: ukt_bukti/{pendaftaranId}.{ext}
 * Admin client dipakai agar path tidak harus user_id (uploader bisa ketua/bendahara).
 */
export async function uploadUktBukti(
  pendaftaranId: string,
  file: File
): Promise<{ path: string } | { error: string }> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Tipe file harus PDF atau gambar (JPG, PNG)." };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { error: "Ukuran file maksimal 1 MB." };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
  const safeExt = getAllowedExtensions().includes(ext) ? ext : "pdf";
  const filePath = `${UKT_BUKTI_FOLDER}/${pendaftaranId}.${safeExt}`;

  const admin = createSupabaseAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await admin.storage
    .from(BUCKET_IJAZAH)
    .upload(filePath, buffer, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: true,
    });

  if (error) return { error: error.message || "Gagal mengunggah file" };
  return { path: filePath };
}
