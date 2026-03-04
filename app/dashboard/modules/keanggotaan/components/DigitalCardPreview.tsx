"use client";

import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import { Anggota } from "../types/Anggota";

export default function DigitalCardPreview({ anggota }: { anggota: Anggota }) {
  const userId = anggota.user_id && anggota.user_id !== "session-only" ? anggota.user_id : null;

  const handlePrint = () => {
    window.print();
  };

  const handlePDF = () => {
    if (!userId) return;
    const url = `/api/anggota/${encodeURIComponent(userId)}/pdf`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const qrValue =
    anggota.nomor ?? anggota.id
      ? `INKAI:${anggota.nomor ?? ""}|${anggota.id}`
      : anggota.id;

  return (
    <div className="w-full max-w-4xl">
      <div
        className="
          w-full
          rounded-2xl overflow-hidden
          bg-gradient-to-b from-slate-900 to-slate-950
          text-white
          shadow-2xl
          border border-amber-500/20
        "
      >
        <div className="h-1 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400" />

        <div className="p-5 flex flex-col sm:flex-row items-stretch gap-5">
          {/* Foto profil */}
          <div className="flex-shrink-0 flex items-center justify-center">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-slate-800/80 ring-1 ring-amber-500/30 flex items-center justify-center">
              {anggota.avatarUrl ? (
                <Image
                  src={anggota.avatarUrl}
                  alt={anggota.nama}
                  width={112}
                  height={112}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <span className="text-amber-500/50 text-xs font-medium">
                  FOTO
                </span>
              )}
            </div>
          </div>

          {/* Identitas */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <h3 className="text-lg sm:text-xl font-semibold text-amber-50 truncate">
              {anggota.nama}
            </h3>
            <p className="text-sm text-slate-400 mt-0.5">
              No. Anggota: {anggota.nomor ?? "—"}
            </p>
            <p className="text-sm text-slate-400">
              Ranting: {anggota.ranting?.nama ?? "—"}
            </p>
          </div>

          {/* QR Code */}
          <div className="flex-shrink-0 flex items-center justify-center">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-white p-1.5 flex items-center justify-center">
              <QRCodeSVG
                value={qrValue}
                size={80}
                level="M"
                includeMargin={false}
              />
            </div>
          </div>
        </div>

        {/* Tombol aksi */}
        <div className="px-5 pb-5 flex gap-3 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="
              flex-1
              bg-amber-600 hover:bg-amber-500
              text-slate-900 text-sm font-semibold
              py-2.5 rounded-lg
              transition-colors
            "
          >
            🖨️ Print
          </button>
          <button
            type="button"
            onClick={handlePDF}
            disabled={!userId}
            className="
              flex-1
              bg-slate-800/80 hover:bg-slate-700/80
              text-amber-200/90 text-sm font-medium
              py-2.5 rounded-lg
              border border-amber-500/30
              transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            📄 PDF
          </button>
        </div>
      </div>
    </div>
  );
}
