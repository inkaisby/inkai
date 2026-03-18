/**
 * Batas unggah gambar (marketplace + berita/feed). Satu sumber untuk API & klien.
 * Dalam KB (bukan MB) agar hemat storage & muat cepat.
 */
export const MARKETPLACE_IMAGE_MAX_KB = 300;
export const MARKETPLACE_IMAGE_MAX_BYTES = MARKETPLACE_IMAGE_MAX_KB * 1024;
