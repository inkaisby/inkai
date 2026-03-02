"use client";

import { ScrollText } from "lucide-react";

/**
 * Modul Event & Pertandingan — placeholder. Konten (jadwal pertandingan, daftar event) bisa ditambahkan kemudian.
 */
export default function EventModule() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ScrollText className="h-8 w-8 text-purple-400" />
        <h1 className="text-xl font-semibold text-cyan-200">Pertandingan</h1>
      </div>
      <div className="rounded-xl border border-cyan-500/30 bg-[#0A0F14]/60 p-6 text-cyan-200/80">
        <p className="text-sm">
          Halaman pertandingan & event. Konten (jadwal kejuaraan, gashuku, event) dapat ditambahkan di sini.
        </p>
      </div>
    </div>
  );
}
