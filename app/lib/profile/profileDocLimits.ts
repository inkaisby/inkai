/**
 * Batas upload dokumen profil (KTP, Akte Lahir, KK) — satu sumber kebenaran (KB).
 * (≈ 2 MB − 250 KB)
 */
export const PROFILE_DOC_MAX_KB = 1798;

export function profileDocMaxBytes(): number {
  return PROFILE_DOC_MAX_KB * 1024;
}

/** Ukuran file dibulatkan ke atas dalam KB (untuk pesan error). */
export function fileSizeKbCeil(bytes: number): number {
  return Math.max(1, Math.ceil(bytes / 1024));
}

/**
 * @returns pesan error Indonesia jika terlalu besar, atau null jika OK
 */
export function validateProfileDocFileSize(file: File): string | null {
  const maxB = profileDocMaxBytes();
  if (file.size > maxB) {
    const kb = fileSizeKbCeil(file.size);
    return `Ukuran file ${kb} KB melebihi batas maksimal ${PROFILE_DOC_MAX_KB} KB.`;
  }
  return null;
}
