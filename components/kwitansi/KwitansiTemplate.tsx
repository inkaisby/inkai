"use client";

import type { KwitansiData } from "./types";
import { formatCurrency, formatDateShort } from "./utils";
import { QRCodeSVG } from "qrcode.react";

type KwitansiTemplateProps = {
  data: KwitansiData;
  printUrl: string;
  /** Sembunyikan tombol aksi (untuk print) */
  hideActions?: boolean;
  /** Slot untuk tombol Kembali & Cetak */
  actionsSlot?: React.ReactNode;
};

/**
 * Template kwitansi — tampilan konsisten untuk display & print.
 * Dipakai di /kwitansi dan cetak PDF.
 */
export function KwitansiTemplate({
  data,
  printUrl,
  hideActions = false,
  actionsSlot,
}: KwitansiTemplateProps) {
  return (
    <div className="min-h-screen bg-white p-8 print:p-4">
      <div className="mx-auto max-w-lg">
        <h1 className="text-lg font-bold text-slate-900">
          KWITANSI PEMBAYARAN
        </h1>
        <p className="mt-2 text-sm text-slate-600">No. {data.no_kwitansi}</p>
        <p className="text-sm text-slate-600">
          Tanggal: {formatDateShort(data.tanggal)}
        </p>
        <div className="mt-6 space-y-1 text-sm text-slate-800">
          <p>
            Sudah terima dari : <strong>{data.nama}</strong>
          </p>
          {data.nomor && <p>No. Anggota : {data.nomor}</p>}
          <p>Ranting : {data.ranting}</p>
          <p>
            Untuk pembayaran : {data.jenis} — {data.event}
          </p>
          <p>
            Sejumlah : <strong>{formatCurrency(data.nominal)}</strong>
          </p>
        </div>
        <div className="mt-8 flex justify-between">
          <div>
            <p className="text-xs text-slate-500">Scan QR untuk cetak ulang</p>
            <div className="mt-2 inline-block border border-slate-200 p-2">
              <QRCodeSVG value={printUrl} size={100} level="M" />
            </div>
          </div>
          <p className="text-right text-sm text-slate-600">
            Petugas,
            <br />
            <span className="mt-4 inline-block w-32 border-b border-slate-400" />
          </p>
        </div>
      </div>
      {!hideActions && actionsSlot && (
        <div className="mt-8 flex flex-wrap justify-center gap-3 print:hidden">
          {actionsSlot}
        </div>
      )}
    </div>
  );
}
