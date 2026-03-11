"use client";

import type { KwitansiRantingData } from "./types";
import { formatCurrency } from "./utils";
import { QRCodeSVG } from "qrcode.react";
import Image from "next/image";

type KwitansiRantingTemplateProps = {
  data: KwitansiRantingData;
  /** URL untuk QR (scan → cetak ulang) */
  printUrl?: string;
  /** Sembunyikan tombol aksi (untuk print) */
  hideActions?: boolean;
  actionsSlot?: React.ReactNode;
};

/**
 * Template kwitansi per ranting — A (total biaya kyu), B (potongan), C (hasil).
 */
export function KwitansiRantingTemplate({
  data,
  printUrl,
  hideActions = false,
  actionsSlot,
}: KwitansiRantingTemplateProps) {
  const tanggalStr = data.tanggal
    ? new Date(data.tanggal).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "—";

  return (
    <div className="min-h-screen bg-slate-50/50 p-8 print:bg-white print:p-6">
      <div className="mx-auto max-w-xl">
        {/* Header dengan logo */}
        <div className="rounded-t-xl border-x border-t border-slate-200 bg-white px-8 pt-8 pb-6 shadow-sm print:shadow-none print:rounded-none print:border-0">
          <div className="mb-4 flex justify-center">
            <div className="h-16 w-16 overflow-hidden rounded-full print:h-14 print:w-14">
              <Image
                src="/logo/inkai-logo.png"
                alt="INKAI"
                width={64}
                height={64}
                className="h-full w-full object-cover"
                priority
              />
            </div>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            KWITANSI PEMBAYARAN
          </h1>
          <p className="mt-0.5 text-sm font-semibold text-teal-600">
            UJIAN KENAIKAN TINGKAT
          </p>
          <p className="mt-0.5 text-xs font-medium uppercase tracking-wider text-slate-500">
            Per Ranting
          </p>
          <div className="mt-6 flex flex-wrap gap-x-8 gap-y-1 text-sm">
            <span className="text-slate-500">No.</span>
            <span className="font-mono font-semibold text-slate-800">
              {data.no_kwitansi}
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600">{tanggalStr}</span>
          </div>
        </div>

        {/* Info transaksi */}
        <div className="border-x border-slate-200 bg-white px-8 py-6 print:border-0">
          <div className="space-y-2 text-sm">
            <p className="flex gap-2">
              <span className="w-36 shrink-0 text-slate-500">
                Sudah terima dari
              </span>
              <span className="font-semibold text-slate-900">
                {data.ranting_nama}
              </span>
              <span className="text-slate-400">(Ranting)</span>
            </p>
            <p className="flex gap-2">
              <span className="w-36 shrink-0 text-slate-500">
                Untuk pembayaran
              </span>
              <span className="text-slate-800">
                {data.jenis} — {data.event}
              </span>
            </p>
          </div>
        </div>

        {/* Tabel rincian */}
        {data.breakdown && data.breakdown.length > 0 && (
          <div className="border-x border-slate-200 bg-white px-8 py-6 print:border-0">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Rincian per Kyu/Dan
            </h2>
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="px-4 py-3 text-left font-medium text-slate-600">
                      Kyu/Dan
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">
                      Jumlah
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">
                      Biaya
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.breakdown.map((r) => (
                    <tr
                      key={r.key}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {r.label}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {r.jumlah}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {formatCurrency(r.biayaSatuan)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800">
                        {formatCurrency(r.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Ringkasan A, B, C */}
        <div className="border-x border-slate-200 bg-white px-8 py-6 print:border-0">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Ringkasan
          </h2>
          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">
                A — Total biaya tiap kyu
              </span>
              <span className="font-semibold tabular-nums text-slate-900">
                {formatCurrency(data.A)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 pt-3">
              <span className="text-sm text-slate-600">
                B — Potongan ({formatCurrency(data.potongan_per_peserta)} ×{" "}
                {data.total_peserta} peserta)
              </span>
              <span className="font-semibold tabular-nums text-amber-700">
                {formatCurrency(data.B)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 bg-teal-50/50 pt-3">
              <span className="text-sm font-medium text-slate-700">
                C — Nominal yang harus dibayar ranting (A − B)
              </span>
              <span className="text-lg font-bold tabular-nums text-teal-700">
                {formatCurrency(data.C)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer: QR + Tanda tangan */}
        <div className="flex flex-wrap items-end justify-between gap-8 rounded-b-xl border border-slate-200 bg-white px-8 py-8 print:rounded-none print:border-0">
          {printUrl && (
            <div>
              <p className="mb-2 text-xs font-medium text-slate-500">
                Scan QR untuk cetak ulang
              </p>
              <div className="rounded-lg border-2 border-slate-200 bg-white p-2">
                <QRCodeSVG value={printUrl} size={96} level="M" />
              </div>
            </div>
          )}
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
