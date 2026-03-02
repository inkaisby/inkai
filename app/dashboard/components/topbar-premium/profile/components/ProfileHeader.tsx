"use client";

import React from "react";

interface ProfileHeaderProps {
  currentStep: number;
  onCloseRequest: () => void;
  /** Sembunyikan tombol Tutup saat profil dipaksa lengkapi */
  hideClose?: boolean;
}

export default function ProfileHeader({
  currentStep,
  onCloseRequest,
  hideClose,
}: ProfileHeaderProps) {

  const titles = {
    1: {
      title: "Informasi Pribadi",
      subtitle: "Lengkapi identitas dasar untuk profil Anda.",
    },
    2: {
      title: "Informasi Alamat",
      subtitle: "Masukkan detail domisili Anda.",
    },
    3: {
      title: "Konfirmasi & Simpan",
      subtitle: "Periksa kembali seluruh data sebelum menyimpan.",
    },
  };

  const { title, subtitle } = titles[currentStep];

  return (
    <div
      className="
        px-6 pt-6 pb-3 
        border-b border-cyan-700/40 
        bg-[#0a0f14]/60 backdrop-blur-lg
        relative
        flex items-start justify-between
      "
    >
      {/* HEADER TEXT */}
      <div>
        <h2 className="text-xl font-semibold text-cyan-200 tracking-wide drop-shadow">
          {title}
        </h2>
        <p className="text-sm text-cyan-400/70 mt-1">{subtitle}</p>
      </div>

      {/* BUTTON TUTUP */}
      {!hideClose && (
        <button
          onClick={onCloseRequest}
          className="
            px-4 py-1.5 
            text-cyan-300 hover:text-black
            bg-cyan-500/20 hover:bg-cyan-300
            border border-cyan-500/30
            rounded-md
            transition font-medium
            shadow-[0_0_10px_rgba(0,255,255,0.3)]
          "
        >
          Tutup
        </button>
      )}
    </div>
  );
}
