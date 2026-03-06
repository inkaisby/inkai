"use client";

import React from "react";
import clsx from "clsx";

interface ProfileButtonsProps {
  step: number;
  maxStep: number;
  next: () => void;
  prev: () => void;
  save: () => void;
  isSaving: boolean;
  canNext: boolean;
  /** Jika false, tombol Simpan Profil dinonaktifkan (mis. foto profil kosong) */
  canSave?: boolean;
}

export default function ProfileButtons({
  step,
  maxStep,
  next,
  prev,
  save,
  isSaving,
  canNext,
  canSave = true,
}: ProfileButtonsProps) {
  return (
    <div className="w-full px-6 py-4 border-t border-cyan-700/30 bg-[#0a0f14]/50 backdrop-blur-md flex justify-between items-center">
      <button
        onClick={prev}
        disabled={step === 1}
        className={clsx(
          "px-4 py-2 rounded-lg text-sm transition border",
          "border-cyan-700 text-cyan-300 hover:bg-cyan-900/40",
          step === 1 && "opacity-40 cursor-not-allowed",
        )}
      >
        Kembali
      </button>

      <div className="flex items-center gap-3">
        {step < maxStep && (
          <button
            onClick={next}
            disabled={!canNext}
            className={clsx(
              "px-5 py-2 rounded-lg text-sm font-medium border transition",
              canNext
                ? "border-cyan-600 bg-cyan-950/40 text-cyan-200 hover:bg-cyan-800/40 shadow-[0_0_10px_rgba(0,255,255,0.25)]"
                : "border-gray-700 bg-gray-900/40 text-gray-500 opacity-40 cursor-not-allowed",
            )}
          >
            Lanjut
          </button>
        )}

        {step === maxStep && (
          <button
            type="button"
            onClick={save}
            disabled={isSaving || !canSave}
            className={clsx(
              "px-5 py-2 rounded-lg text-sm font-semibold transition",
              isSaving || !canSave
                ? "bg-gray-600 text-gray-300 cursor-not-allowed"
                : "bg-gradient-to-r from-cyan-400 to-cyan-300 text-black shadow-[0_0_15px_rgba(0,255,255,0.5)] hover:shadow-[0_0_25px_rgba(0,255,255,0.8)]",
            )}
          >
            {isSaving ? "Menyimpan..." : "Simpan Profil"}
          </button>
        )}
      </div>
    </div>
  );
}
