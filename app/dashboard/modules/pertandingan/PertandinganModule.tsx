"use client";

import Link from "next/link";
import { Trophy, ArrowLeft } from "lucide-react";

/**
 * Modul Pertandingan — placeholder; konten (jadwal, hasil, pendaftaran) dapat dikembangkan nanti.
 */
export default function PertandinganModule() {
  return (
    <div className="space-y-8">
      <header className="border-b border-white/10 pb-6">
        <Link
          href="/dashboard/home-base"
          className="mb-4 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:border-emerald-500/30 hover:bg-white/[0.06] hover:text-emerald-200/90"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Kembali ke Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <Trophy className="h-9 w-9 text-emerald-500/80" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
              Pertandingan
            </h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              Data pertandingan di wilayah terfilter. Modul dalam pengembangan.
            </p>
          </div>
        </div>
      </header>

      <div className="rounded-2xl border border-white/10 bg-slate-800/30 p-8 text-center">
        <Trophy className="mx-auto h-12 w-12 text-white/20" />
        <p className="mt-4 text-sm text-white/60">
          Modul Pertandingan akan berisi jadwal, hasil, dan pendaftaran pertandingan.
        </p>
        <p className="mt-1 text-xs text-white/40">
          Halaman ini siap diisi konten.
        </p>
      </div>
    </div>
  );
}
