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
