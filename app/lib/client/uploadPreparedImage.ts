import { prepareMarketplaceUploadFile } from "@/app/lib/marketplaceImageUpload";

/** Kompres/resize (selaras marketplace & berita) lalu POST ke endpoint upload gambar. */
export async function uploadPreparedImage(
  file: File,
  uploadUrl: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const prep = await prepareMarketplaceUploadFile(file);
  if (!prep.ok) return { ok: false, error: prep.message };

  const fd = new FormData();
  fd.append("file", prep.file);
  const res = await fetch(uploadUrl, {
    method: "POST",
    credentials: "include",
    body: fd,
  });
  const data = (await res.json().catch(() => ({}))) as { url?: string; message?: string };
  if (!res.ok) {
    return { ok: false, error: data?.message ?? "Gagal mengunggah gambar" };
  }
  if (!data?.url) {
    return { ok: false, error: "Server tidak mengembalikan URL gambar" };
  }
  return { ok: true, url: data.url };
}
