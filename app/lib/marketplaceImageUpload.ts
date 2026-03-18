import { MARKETPLACE_IMAGE_MAX_BYTES } from "@/app/lib/marketplaceImageLimits";

export { MARKETPLACE_IMAGE_MAX_BYTES } from "@/app/lib/marketplaceImageLimits";
/** Sisi terpanjang (px); jika lebih besar, gambar diperkecil sebelum unggah */
export const MARKETPLACE_IMAGE_MAX_EDGE_PX = 1920;

export function formatImageSizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const ALLOWED = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/**
 * Pastikan file siap diunggah: cek tipe & kapasitas; GIF hanya cek ukuran;
 * JPEG/PNG/WebP: jika terlalu besar (byte atau piksel), kompres + resize.
 */
export async function prepareMarketplaceUploadFile(
  file: File,
): Promise<{ ok: true; file: File } | { ok: false; message: string }> {
  const type = (file.type || "").toLowerCase();
  if (!ALLOWED.has(type)) {
    return {
      ok: false,
      message: "Gunakan JPEG, PNG, WebP, atau GIF.",
    };
  }

  if (type === "image/gif") {
    if (file.size > MARKETPLACE_IMAGE_MAX_BYTES) {
      return {
        ok: false,
        message: `Ukuran file maksimal ${formatImageSizeLabel(MARKETPLACE_IMAGE_MAX_BYTES)}. File Anda ${formatImageSizeLabel(file.size)}.`,
      };
    }
    return { ok: true, file };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { ok: false, message: "Gagal membaca gambar." };
  }

  try {
    const maxEdge = MARKETPLACE_IMAGE_MAX_EDGE_PX;
    let w = bitmap.width;
    let h = bitmap.height;
    const longest = Math.max(w, h);
    const scale = longest > maxEdge ? maxEdge / longest : 1;
    const outW = Math.round(w * scale);
    const outH = Math.round(h * scale);

    const overSize = file.size > MARKETPLACE_IMAGE_MAX_BYTES;
    const overPixels = scale < 1;

    if (!overSize && !overPixels) {
      bitmap.close();
      return { ok: true, file };
    }

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return { ok: false, message: "Browser tidak bisa memproses gambar." };
    }
    ctx.drawImage(bitmap, 0, 0, outW, outH);
    bitmap.close();

    const tryCompress = async (cw: number, ch: number) => {
      let quality = 0.9;
      for (let attempt = 0; attempt < 16; attempt++) {
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), "image/jpeg", quality);
        });
        if (!blob) break;
        if (blob.size <= MARKETPLACE_IMAGE_MAX_BYTES) {
          const base = file.name.replace(/\.[^.]+$/i, "") || "produk";
          return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
        }
        quality -= 0.055;
      }
      return null;
    };

    let cw = outW;
    let ch = outH;
    let fileOut = await tryCompress(cw, ch);
    if (fileOut) return { ok: true, file: fileOut };

    /* Masih terlalu besar: turunkan resolusi bertahap (min ~320px) */
    let b2: ImageBitmap | null = null;
    try {
      b2 = await createImageBitmap(file);
      let shrink = 0.88;
      while (Math.max(cw, ch) > 320) {
        cw = Math.max(320, Math.round(cw * shrink));
        ch = Math.max(320, Math.round(ch * shrink));
        canvas.width = cw;
        canvas.height = ch;
        const ctx2 = canvas.getContext("2d");
        if (!ctx2) break;
        if (type === "image/png" || type === "image/webp") {
          ctx2.fillStyle = "#fff";
          ctx2.fillRect(0, 0, cw, ch);
        }
        ctx2.drawImage(b2, 0, 0, cw, ch);
        fileOut = await tryCompress(cw, ch);
        if (fileOut) return { ok: true, file: fileOut };
        shrink *= 0.92;
      }
    } finally {
      b2?.close();
    }

    return {
      ok: false,
      message: `Tetap melebihi ${formatImageSizeLabel(MARKETPLACE_IMAGE_MAX_BYTES)} (maks. kapasitas unggah). Pilih foto lain atau kompres manual.`,
    };
  } catch {
    try {
      bitmap.close();
    } catch {
      /* ignore */
    }
    return { ok: false, message: "Gagal menyesuaikan ukuran gambar." };
  }
}
