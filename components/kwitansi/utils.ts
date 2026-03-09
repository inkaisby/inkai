/**
 * Utilitas template kwitansi — format currency, tanggal, dll.
 */

export const formatCurrency = (v: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v);

export const formatDateShort = (s: string) =>
  s
    ? new Date(s).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

export const formatDateLong = (s: string) =>
  s
    ? new Date(s).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "";

/** Fetch logo INKAI sebagai data URL (untuk PDF). Hanya di client. */
export async function fetchInkaiLogoDataUrl(): Promise<string | undefined> {
  if (typeof window === "undefined") return undefined;
  try {
    const res = await fetch("/logo/inkai-logo.png");
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}
