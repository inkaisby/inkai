/**
 * Generator PDF kwitansi per ranting.
 */
import type { KwitansiRantingData } from "./types";
import { formatCurrency } from "./utils";

export type JsPDFInstance = import("jspdf").jsPDF;

const LAYOUT = {
  marginX: 20,
  marginTop: 20,
  pageW: 210,
  logoSize: 28,
  titleSize: 16,
  subtitleSize: 10,
  bodySize: 10,
  lineHeight: 7,
  qrSize: 36,
  qrLabelSize: 8,
} as const;

export function renderKwitansiRantingPdf(
  doc: JsPDFInstance,
  data: KwitansiRantingData,
  qrDataUrl?: string,
  logoDataUrl?: string
): void {
  const x = LAYOUT.marginX;
  const pageW = LAYOUT.pageW;
  const contentW = pageW - LAYOUT.marginX * 2;
  let y = LAYOUT.marginTop;
  const lh = LAYOUT.lineHeight;

  // Logo (bulat — ukuran persegi agar tidak terdistorsi)
  if (logoDataUrl) {
    doc.addImage(
      logoDataUrl,
      "PNG",
      x,
      y,
      LAYOUT.logoSize,
      LAYOUT.logoSize
    );
    y += LAYOUT.logoSize + 6;
  }

  // Header
  doc.setFontSize(LAYOUT.titleSize);
  doc.setFont("helvetica", "bold");
  doc.text("KWITANSI PEMBAYARAN", x, y);
  y += lh;
  doc.setFontSize(LAYOUT.subtitleSize);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(13, 148, 136);
  doc.text("UJIAN KENAIKAN TINGKAT", x, y);
  doc.setTextColor(0, 0, 0);
  y += lh;
  doc.setFontSize(8);
  doc.text("Per Ranting", x, y);
  y += lh + 2;

  // No & Tanggal
  const tanggalStr = data.tanggal
    ? new Date(data.tanggal).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "";
  doc.setFont("helvetica", "bold");
  doc.text(`No. ${data.no_kwitansi ?? ""}`, x, y);
  doc.setFont("helvetica", "normal");
  doc.text(`  •  ${tanggalStr}`, x + 45, y);
  y += lh + 4;

  // Info transaksi
  doc.text(`Sudah terima dari : ${data.ranting_nama ?? ""} (Ranting)`, x, y);
  y += lh;
  doc.text(`Untuk pembayaran : ${data.jenis} — ${data.event ?? ""}`, x, y);
  y += lh + 4;

  // Tabel rincian
  if (data.breakdown && data.breakdown.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("RINCIAN PER KYU/DAN", x, y);
    y += lh + 2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(LAYOUT.bodySize);

    const col1 = x;
    const col4 = x + 110;
    const col5 = x + contentW - 10;

    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(x, y - 2, contentW, lh + 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Kyu/Dan", col1, y + 4);
    doc.text("Jumlah", col4, y + 4);
    doc.text("Biaya", col5 - 25, y + 4);
    doc.text("Subtotal", col5, y + 4);
    y += lh + 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(LAYOUT.bodySize);

    for (const r of data.breakdown) {
      doc.text(r.label, col1, y);
      doc.text(String(r.jumlah), col4, y);
      doc.text(formatCurrency(r.biayaSatuan), col5 - 25, y);
      doc.text(formatCurrency(r.subtotal), col5, y);
      y += lh;
    }
    y += 4;
  }

  // Ringkasan A, B, C
  doc.setFillColor(248, 250, 252);
  doc.rect(x, y, contentW, lh * 4 + 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("RINGKASAN", x + 4, y + 5);
  y += lh + 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(LAYOUT.bodySize);
  doc.text("A — Total biaya tiap kyu", x + 4, y);
  doc.text(formatCurrency(data.A), x + contentW - 14, y);
  y += lh + 2;
  doc.text(
    `B — Potongan (${formatCurrency(data.potongan_per_peserta)} × ${data.total_peserta} peserta)`,
    x + 4,
    y
  );
  doc.setTextColor(180, 83, 9); // amber-700
  doc.text(formatCurrency(data.B), x + contentW - 14, y);
  doc.setTextColor(0, 0, 0);
  y += lh + 2;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(13, 148, 136); // teal
  doc.text("C — Nominal yang harus dibayar ranting (A − B)", x + 4, y);
  doc.text(formatCurrency(data.C), x + contentW - 14, y);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  y += lh + 8;

  // Footer: QR + Tanda tangan
  const footerY = y;
  if (qrDataUrl) {
    doc.addImage(
      qrDataUrl,
      "PNG",
      x,
      footerY,
      LAYOUT.qrSize,
      LAYOUT.qrSize
    );
    doc.setFontSize(LAYOUT.qrLabelSize);
    doc.text(
      "Scan QR untuk cetak ulang",
      x + LAYOUT.qrSize + 4,
      footerY + LAYOUT.qrSize / 2
    );
  }
}

export function getKwitansiRantingFilename(data: KwitansiRantingData): string {
  const safe = (data.ranting_nama ?? "ranting").replace(/[^a-zA-Z0-9]/g, "-");
  return `kwitansi-ranting-${safe}.pdf`;
}
