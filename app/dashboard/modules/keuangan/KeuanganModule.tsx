"use client";

import { useState } from "react";
import { FileText, Printer } from "lucide-react";
import jsPDF from "jspdf";

type PaymentRow = {
  id: string;
  nama: string;
  jenis: string;
  event: string;
  nominal: number;
  tanggal: string;
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v);

export default function KeuanganModule() {
  // Demo data kwitansi; nanti bisa diganti hasil fetch dari API pembayaran
  const [payments] = useState<PaymentRow[]>([
    {
      id: "kw-001",
      nama: "Budi Santoso",
      jenis: "Event",
      event: "Kejuaraan Kota Surabaya 2026",
      nominal: 250_000,
      tanggal: new Date().toISOString(),
    },
    {
      id: "kw-002",
      nama: "Siti Aminah",
      jenis: "Ujian Kyu",
      event: "Ujian Kyu Periode Maret",
      nominal: 150_000,
      tanggal: new Date().toISOString(),
    },
  ]);

  const handlePrintReceipt = (row: PaymentRow) => {
    const doc = new jsPDF();
    const marginX = 20;
    let y = 20;

    doc.setFontSize(14);
    doc.text("KWITANSI PEMBAYARAN", marginX, y);
    y += 8;

    doc.setFontSize(10);
    doc.text(`Nomor : ${row.id}`, marginX, y);
    y += 6;
    doc.text(
      `Tanggal : ${new Date(row.tanggal).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })}`,
      marginX,
      y,
    );
    y += 10;

    doc.text(`Sudah terima dari : ${row.nama}`, marginX, y);
    y += 6;
    doc.text(`Untuk pembayaran : ${row.jenis} - ${row.event}`, marginX, y);
    y += 6;
    doc.text(`Sejumlah : ${formatCurrency(row.nominal)}`, marginX, y);
    y += 10;

    doc.text("Petugas,", marginX + 120, y);
    y += 20;
    doc.text("__________________", marginX + 110, y);

    doc.save(`${row.id}-kwitansi.pdf`);
  };

  return (
    <div className="space-y-6 p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-teal-300" />
          <div>
            <h1 className="text-base font-semibold text-white">
              Kwitansi Pembayaran
            </h1>
            <p className="text-xs text-white/60">
              Area kerja bendahara untuk melihat dan mencetak kwitansi
              pembayaran event, ujian, atau iuran.
            </p>
          </div>
        </div>
      </div>

      <div className="border border-white/10 rounded-lg overflow-hidden bg-white/[0.02]">
        <table className="w-full text-[11px]">
          <thead className="bg-white/5">
            <tr className="text-white/60">
              <th className="px-3 py-2 text-left w-24">Tanggal</th>
              <th className="px-3 py-2 text-left">Nama</th>
              <th className="px-3 py-2 text-left">Jenis</th>
              <th className="px-3 py-2 text-right w-24">Nominal</th>
              <th className="px-3 py-2 text-right w-24">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr
                key={p.id}
                className="border-t border-white/5 hover:bg-white/[0.04]"
              >
                <td className="px-3 py-2 text-white/60">
                  {new Date(p.tanggal).toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="px-3 py-2 text-white/90">{p.nama}</td>
                <td className="px-3 py-2 text-white/70">
                  {p.jenis} — {p.event}
                </td>
                <td className="px-3 py-2 text-right text-amber-300">
                  {formatCurrency(p.nominal)}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => handlePrintReceipt(p)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded border border-teal-500/60 text-teal-200 hover:bg-teal-500/10"
                  >
                    <Printer size={12} />
                    Cetak
                  </button>
                </td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-3 text-center text-white/50 text-xs"
                >
                  Belum ada data pembayaran.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
