"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, ChevronDown, ChevronUp, ClipboardList, FileCheck, Settings2, UserPlus } from "lucide-react";
import { useScope } from "@/app/dashboard/components/topbar-premium/context/ScopeContext";
import { getPrefetch } from "@/app/dashboard/lib/prefetchCache";
import PendaftaranUKT, { type AnggotaAktifSelected } from "../event/components/PendaftaranUKT";
import ResumeUKT from "../event/components/ResumeUKT";
import KelolaUKTCabang from "../event/components/KelolaUKTCabang";

type UjianRow = {
  id: string;
  judul: string;
  kategori: string;
  tingkat: string;
  tanggal: string;
  status: string;
  created_at: string;
};

type HasilRow = {
  id: string;
  nilai: number;
  nilai_maks: number;
  lulus: boolean;
  target_tingkat: string;
  created_at: string;
};

type Ringkasan = {
  totalUjian: number;
  totalPeserta: number;
  pesertaLulus: number;
  ujianTerbaru: UjianRow[];
  hasilTerbaru: HasilRow[];
};

type ViewAudit = "ringkasan" | "pendaftaran";

export default function AuditUjianModule() {
  const { scope } = useScope();
  const [data, setData] = useState<Ringkasan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewAudit>("ringkasan");
  const [filterTahunId, setFilterTahunId] = useState("");
  const [filterRantingId, setFilterRantingId] = useState("");
  const [resumeVersion, setResumeVersion] = useState(0);
  const [pendingSelection, setPendingSelection] = useState<AnggotaAktifSelected[]>([]);
  const [kelolaUktExpanded, setKelolaUktExpanded] = useState(false);

  const handleFilterChange = useCallback((tahunId: string, rantingId: string) => {
    setFilterTahunId(tahunId);
    setFilterRantingId(rantingId);
  }, []);

  const handleRegistrationSuccess = useCallback(() => {
    setResumeVersion((v) => v + 1);
  }, []);

  const handleSelectionChange = useCallback((members: AnggotaAktifSelected[]) => {
    setPendingSelection(members);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const cached = getPrefetch<Ringkasan>("audit-ujian-ringkasan");
    if (cached) {
      setData(cached);
      setLoading(false);
    }

    fetch("/api/audit-ujian/ringkasan", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || "Gagal memuat data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <header className="border-b border-white/10 pb-6">
          <Link
            href="/dashboard/home-base"
            className="mb-4 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:border-amber-500/30 hover:bg-white/[0.06] hover:text-amber-200/90"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            Kembali ke Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <BarChart3 className="h-9 w-9 text-amber-500/80" />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">UKT (Ujian Kenaikan Tingkat)</h1>
              <p className="mt-0.5 text-sm text-zinc-500">
                Ringkasan UKT, peserta, dan hasil dari tabel ujian, ujian_peserta, ujian_hasil.
              </p>
            </div>
          </div>
        </header>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center text-zinc-500 shadow-sm">
          Memuat ringkasan…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <header className="border-b border-white/10 pb-6">
          <Link
            href="/dashboard/home-base"
            className="mb-4 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:border-amber-500/30 hover:bg-white/[0.06] hover:text-amber-200/90"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            Kembali ke Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <BarChart3 className="h-9 w-9 text-amber-500/80" />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">UKT (Ujian Kenaikan Tingkat)</h1>
              <p className="mt-0.5 text-sm text-zinc-500">
                Ringkasan UKT, peserta, dan hasil dari tabel ujian, ujian_peserta, ujian_hasil.
              </p>
            </div>
          </div>
        </header>
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      </div>
    );
  }

  const r = data!;

  return (
    <div className="space-y-8">
      <header className="border-b border-white/10 pb-6">
        <Link
          href="/dashboard/home-base"
          className="mb-4 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:border-amber-500/30 hover:bg-white/[0.06] hover:text-amber-200/90"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Kembali ke Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <BarChart3 className="h-9 w-9 text-amber-500/80" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">UKT (Ujian Kenaikan Tingkat)</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              Ringkasan UKT, peserta, dan hasil dari tabel ujian, ujian_peserta, ujian_hasil.
            </p>
          </div>
        </div>
      </header>

      <nav className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setView("pendaftaran")}
          className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition ${
            view === "pendaftaran"
              ? "bg-teal-500/20 text-teal-200 shadow-sm border border-teal-400/25"
              : "bg-white/[0.04] text-zinc-500 border border-transparent hover:bg-teal-500/10 hover:text-teal-300/90 hover:border-teal-400/15"
          }`}
        >
          <UserPlus className="h-4 w-4 shrink-0" />
          Pendaftaran & Kelola UKT
        </button>
        <button
          type="button"
          onClick={() => setView("ringkasan")}
          className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition ${
            view === "ringkasan"
              ? "bg-amber-500/20 text-amber-200 shadow-sm border border-amber-400/25"
              : "bg-white/[0.04] text-zinc-500 border border-transparent hover:bg-amber-500/10 hover:text-amber-300/90 hover:border-amber-400/15"
          }`}
        >
          <BarChart3 className="h-4 w-4 shrink-0" />
          Ringkasan
        </button>
      </nav>

      {view === "pendaftaran" && (
        <div className="space-y-8">
          {/* Kelola UKT (tahun, biaya, tutup) — hanya Cabang/PP; kolapsibel */}
          {((scope?.cabang_ids?.length ?? 0) > 0 || scope?.is_pp) && (
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
              <button
                type="button"
                onClick={() => setKelolaUktExpanded((v) => !v)}
                className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-violet-400/80 shrink-0" />
                  <div>
                    <h2 className="text-base font-semibold text-zinc-100">Kelola UKT</h2>
                    <p className="text-sm text-zinc-500">
                      Atur tahun ajaran, biaya per kyu, dan tutup tahun.
                    </p>
                  </div>
                </div>
                <span className="text-zinc-400 shrink-0">
                  {kelolaUktExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </span>
              </button>
              {kelolaUktExpanded && (
                <div className="border-t border-white/10 px-6 pb-6 pt-2">
                  <KelolaUKTCabang />
                </div>
              )}
            </section>
          )}
          {/* Pendaftaran peserta + Resume */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="min-w-0">
              <PendaftaranUKT
                onFilterChange={handleFilterChange}
                onRegistrationSuccess={handleRegistrationSuccess}
                onSelectionChange={handleSelectionChange}
                refreshTrigger={resumeVersion}
              />
            </div>
            <div className="min-w-0">
              <ResumeUKT
                tahunId={filterTahunId}
                rantingId={filterRantingId}
                resumeVersion={resumeVersion}
                pendingSelection={pendingSelection}
                onBatalSuccess={handleRegistrationSuccess}
              />
            </div>
          </div>
        </div>
      )}

      {view === "ringkasan" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-zinc-100">Ringkasan</h2>
            <p className="mb-6 text-sm text-zinc-500">
              Total UKT, peserta, dan peserta lulus dari tabel ujian, ujian_peserta, ujian_hasil.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 shadow-sm">
                <div className="text-2xl font-bold text-amber-400/90">{r.totalUjian}</div>
                <div className="mt-1 text-xs font-medium text-zinc-400">Total UKT</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 shadow-sm">
                <div className="text-2xl font-bold text-amber-400/90">{r.totalPeserta}</div>
                <div className="mt-1 text-xs font-medium text-zinc-400">
                  Total peserta (ujian_peserta)
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 shadow-sm">
                <div className="text-2xl font-bold text-amber-400/90">{r.pesertaLulus}</div>
                <div className="mt-1 text-xs font-medium text-zinc-400">
                  Peserta lulus (ujian_hasil)
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.03] p-6 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-zinc-100">
                <ClipboardList className="h-5 w-5 text-amber-500/80" />
                Ujian terbaru
              </h2>
              <p className="mb-4 text-sm text-zinc-500">Riwayat ujian (tabel ujian).</p>
              {r.ujianTerbaru.length === 0 ? (
                <p className="text-sm text-zinc-500">Belum ada data ujian.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-white/10">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.02] text-left text-zinc-400">
                        <th className="px-4 py-3">Judul</th>
                        <th className="px-4 py-3">Kategori</th>
                        <th className="px-4 py-3">Tingkat</th>
                        <th className="px-4 py-3">Tanggal</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.ujianTerbaru.map((row) => (
                        <tr key={row.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                          <td className="px-4 py-3 text-zinc-200">{row.judul}</td>
                          <td className="px-4 py-3 text-zinc-400">{row.kategori}</td>
                          <td className="px-4 py-3 text-zinc-400">{row.tingkat || "—"}</td>
                          <td className="px-4 py-3 text-zinc-400">
                            {row.tanggal
                              ? new Date(row.tanggal).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={
                                row.status === "selesai"
                                  ? "text-emerald-400"
                                  : row.status === "dibuka"
                                    ? "text-amber-400"
                                    : "text-zinc-500"
                              }
                            >
                              {row.status || "—"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.03] p-6 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-zinc-100">
                <FileCheck className="h-5 w-5 text-amber-500/80" />
                Hasil terbaru
              </h2>
              <p className="mb-4 text-sm text-zinc-500">Riwayat hasil (tabel ujian_hasil).</p>
              {r.hasilTerbaru.length === 0 ? (
                <p className="text-sm text-zinc-500">Belum ada hasil ujian.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-white/10">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.02] text-left text-zinc-400">
                        <th className="px-4 py-3">Nilai</th>
                        <th className="px-4 py-3">Target tingkat</th>
                        <th className="px-4 py-3">Lulus</th>
                        <th className="px-4 py-3">Tanggal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.hasilTerbaru.map((row) => (
                        <tr key={row.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                          <td className="px-4 py-3 text-zinc-200">
                            {row.nilai} / {row.nilai_maks}
                          </td>
                          <td className="px-4 py-3 text-zinc-400">{row.target_tingkat || "—"}</td>
                          <td className="px-4 py-3">
                            <span
                              className={
                                row.lulus ? "text-emerald-400" : "text-red-400"
                              }
                            >
                              {row.lulus ? "Lulus" : "Tidak lulus"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-zinc-500">
                            {row.created_at
                              ? new Date(row.created_at).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
