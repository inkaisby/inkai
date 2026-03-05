"use client";

import { useCallback, useState } from "react";
import { ScrollText, ClipboardList, History } from "lucide-react";
import PendaftaranUKT from "./components/PendaftaranUKT";
import ResumeUKT from "./components/ResumeUKT";
import RiwayatUKT from "./components/RiwayatUKT";

type ViewUKT = "dua-kolom" | "riwayat";

/**
 * Modul Event & Ujian: UKT (Ujian Kenaikan Tingkat).
 * Dua kolom: kiri Pendaftaran UKT (filter + centang anggota), kanan Resume = laporan untuk tahun & ranting yang sama.
 * Setelah daftar disimpan, laporan kanan otomatis ter-update. Tab Riwayat UKT untuk daftar informatif.
 */
export default function EventModule() {
  const [view, setView] = useState<ViewUKT>("dua-kolom");
  const [filterTahunId, setFilterTahunId] = useState("");
  const [filterRantingId, setFilterRantingId] = useState("");
  const [resumeVersion, setResumeVersion] = useState(0);

  const handleFilterChange = useCallback((tahunId: string, rantingId: string) => {
    setFilterTahunId(tahunId);
    setFilterRantingId(rantingId);
  }, []);

  const handleRegistrationSuccess = useCallback(() => {
    setResumeVersion((v) => v + 1);
  }, []);

  return (
    <div className="space-y-8">
      <header className="border-b border-white/10 pb-6">
        <div className="flex items-center gap-3">
          <ScrollText className="h-9 w-9 text-amber-500/80" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Event & Ujian</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              Pendaftaran UKT, laporan per ranting, dan riwayat pendaftaran.
            </p>
          </div>
        </div>
      </header>

      <nav className="flex flex-wrap gap-1 rounded-lg bg-white/[0.03] p-1">
        <button
          type="button"
          onClick={() => setView("dua-kolom")}
          className={`flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition ${
            view === "dua-kolom"
              ? "bg-white/10 text-zinc-100 shadow-sm"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <ClipboardList className="h-4 w-4 shrink-0" />
          Pendaftaran & Resume
        </button>
        <button
          type="button"
          onClick={() => setView("riwayat")}
          className={`flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition ${
            view === "riwayat"
              ? "bg-white/10 text-zinc-100 shadow-sm"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <History className="h-4 w-4 shrink-0" />
          Riwayat UKT
        </button>
      </nav>

      {view === "dua-kolom" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="min-w-0">
            <PendaftaranUKT
              onFilterChange={handleFilterChange}
              onRegistrationSuccess={handleRegistrationSuccess}
            />
          </div>
          <div className="min-w-0">
            <ResumeUKT
              tahunId={filterTahunId}
              rantingId={filterRantingId}
              resumeVersion={resumeVersion}
            />
          </div>
        </div>
      )}
      {view === "riwayat" && <RiwayatUKT />}
    </div>
  );
}
