/**
 * Generator PDF kwitansi — layout konsisten dengan template.
 * Dipakai oleh KeuanganModule, ResumeUKT, dll.
 */
import type { KwitansiData } from "./types";
import { formatCurrency } from "./utils";

export type JsPDFInstance = import("jspdf").jsPDF;

/** Layout PDF — ubah di sini untuk konsistensi semua cetak kwitansi */
const LAYOUT = {
  marginX: 20,
  marginTop: 20,
  titleSize: 14,
  bodySize: 10,
  lineHeight: 8,
  qrSize: 30,
  qrLabelSize: 8,
} as const;

/**
 * Render PDF kwitansi ke dokumen jsPDF.
 * Pastikan qrDataUrl sudah di-fetch.
 */
export function renderKwitansiPdf(
  doc: JsPDFInstance,
  data: KwitansiData,
  qrDataUrl: string
): void {
  const x = LAYOUT.marginX;
  let y = LAYOUT.marginTop;
  const lh = LAYOUT.lineHeight;

  doc.setFontSize(LAYOUT.titleSize);
  doc.setFont("helvetica", "bold");
  doc.text("KWITANSI PEMBAYARAN", x, y);
  y += lh;

  doc.setFontSize(LAYOUT.bodySize);
  doc.setFont("helvetica", "normal");
  doc.text(`No. ${data.no_kwitansi ?? ""}`, x, y);
  y += lh;
  doc.text(
    `Tanggal: ${data.tanggal ? new Date(data.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }) : ""}`,
    x,
    y
  );
  y += lh;
  doc.text(`Nama: ${data.nama ?? ""}`, x, y);
  y += lh;
  doc.text(`No. Anggota: ${data.nomor ?? ""}`, x, y);
  y += lh;
  doc.text(`Event: ${data.event ?? ""}`, x, y);
  y += lh;
  doc.text(`Ranting: ${data.ranting ?? ""}`, x, y);
  y += lh;
  doc.text(
    `Terbilang: ${formatCurrency(Number(data.nominal ?? 0))}`,
    x,
    y
  );
  y += lh + 4;

  doc.addImage(qrDataUrl, "PNG", x, y, LAYOUT.qrSize, LAYOUT.qrSize);
  doc.setFontSize(LAYOUT.qrLabelSize);
  doc.text("Scan QR untuk cetak ulang", x + LAYOUT.qrSize + 4, y + LAYOUT.qrSize / 2);
}

/** Nama file PDF yang disarankan */
export function getKwitansiFilename(data: KwitansiData): string {
  return `kwitansi-${(data.no_kwitansi ?? "ukt").replace(/\s/g, "-")}.pdf`;
}
