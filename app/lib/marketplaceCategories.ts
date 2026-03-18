/** Preset kategori produk marketplace (bisa ditambah custom "Lainnya") */
export const MARKETPLACE_CATEGORY_PRESETS = [
  "Seragam",
  "Sabuk",
  "Perlengkapan",
  "Buku",
  "Aksesoris",
] as const;

export function categoryFormFromStored(
  cat: string | null | undefined,
): { select: string; custom: string } {
  const c = (cat ?? "").trim();
  if (!c) return { select: "", custom: "" };
  if ((MARKETPLACE_CATEGORY_PRESETS as readonly string[]).includes(c)) {
    return { select: c, custom: "" };
  }
  return { select: "lainnya", custom: c };
}

export function categoryStoredFromForm(select: string, custom: string): string {
  if (select === "lainnya") return custom.trim().slice(0, 80);
  return select.trim().slice(0, 80);
}
