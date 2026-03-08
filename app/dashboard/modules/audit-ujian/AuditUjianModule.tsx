"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Award, BarChart3, ChevronDown, ChevronUp, ClipboardList, FileCheck, Settings2, TrendingUp, UserPlus, Users } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useScope } from "@/app/dashboard/components/topbar-premium/context/ScopeContext";
import { useBootstrapStore } from "@/app/dashboard/store/bootstrapStore";
import { getPrefetch } from "@/app/dashboard/lib/prefetchCache";
import PendaftaranUKT, { type AnggotaAktifSelected } from "../event/components/PendaftaranUKT";
import ResumeUKT from "../event/components/ResumeUKT";
import KelolaUKTCabang from "../event/components/KelolaUKTCabang";

const ROOT_EMAIL = process.env.NEXT_PUBLIC_INKAI_ROOT_EMAIL?.toLowerCase() ?? null;

function getMaxLevel(user: { structural_roles?: { structural_level: number; active?: boolean }[]; profile_structural_level?: number | null } | null): number {
  if (!user) return 0;
  const fromRoles = (user.structural_roles ?? []).filter((r) => r.active !== false).map((r) => r.structural_level ?? 0);
  const fromProfile = user.profile_structural_level != null ? [user.profile_structural_level] : [];
  const all = [...fromRoles, ...fromProfile];
  return all.length ? Math.max(...all) : 0;
}

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

type RantingIkut = { id: string; nama: string };

type Ringkasan = {
  totalUjian: number;
  totalRantingIkutUjian: number;
  listRantingIkutUjian: RantingIkut[];
  totalPeserta: number;
  pesertaLulus: number;
  ujianTerbaru: UjianRow[];
  hasilTerbaru: HasilRow[];
};

type ViewAudit = "ringkasan" | "pendaftaran";

/** Warna aksen widget dashboard UKT */
const UKT_KPI_ACCENTS = {
  ujian: { card: "border border-amber-500/20 bg-amber-950/30", value: "text-amber-200", icon: "text-amber-400", label: "text-amber-300/80" },
  peserta: { card: "border border-teal-500/20 bg-teal-950/30", value: "text-teal-200", icon: "text-teal-400", label: "text-teal-300/80" },
  lulus: { card: "border border-emerald-500/20 bg-emerald-950/30", value: "text-emerald-200", icon: "text-emerald-400", label: "text-emerald-300/80" },
  rate: { card: "border border-violet-500/20 bg-violet-950/30", value: "text-violet-200", icon: "text-violet-400", label: "text-violet-300/80" },
} as const;

const CHART_COLORS = ["#34d399", "#f59e0b", "#6366f1", "#ec4899", "#14b8a6", "#a855f7"];
const PIE_COLORS = ["#34d399", "#f87171"]; // lulus, tidak lulus

export default function AuditUjianModule() {
  const { scope } = useScope();
  const user = useBootstrapStore((s) => s.data?.user ?? null);
  const canAccessUKT = useMemo(() => {
    if (!user) return false;
    if (ROOT_EMAIL && (user.email?.toLowerCase() ?? "") === ROOT_EMAIL) return true;
    if ((user.app_role ?? "").toUpperCase() === "SUPERADMIN") return true;
    const maxLevel = getMaxLevel(user);
    return maxLevel >= 2 && maxLevel <= 5;
  }, [user]);

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

    const cached = getPrefetch<Ringkasan>("ukt-ringkasan");
    if (cached) {
      queueMicrotask(() => {
        setData(cached);
        setLoading(false);
      });
    }

    fetch("/api/ukt/ringkasan", { credentials: "include" })
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

  /** Data grafik & turunan (harus di atas early return agar jumlah hook tetap) */
  const chartLulusData = useMemo(() => {
    if (!data) return [];
    const lulus = data.pesertaLulus;
    const tidakLulus = Math.max(0, data.totalPeserta - lulus);
    return [
      { name: "Lulus", value: lulus, fill: PIE_COLORS[0] },
      { name: "Tidak lulus", value: tidakLulus, fill: PIE_COLORS[1] },
    ].filter((d) => d.value > 0);
  }, [data]);

  const chartStatusData = useMemo(() => {
    if (!data) return [];
    const byStatus: Record<string, number> = {};
    for (const u of data.ujianTerbaru) {
      const s = u.status || "lainnya";
      byStatus[s] = (byStatus[s] ?? 0) + 1;
    }
    return Object.entries(byStatus).map(([name, jumlah]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      jumlah,
      fill: CHART_COLORS[Object.keys(byStatus).indexOf(name) % CHART_COLORS.length],
    }));
  }, [data]);

  const tingkatKelulusan = useMemo(() => {
    if (!data || data.totalPeserta <= 0) return null;
    return Math.round((data.pesertaLulus / data.totalPeserta) * 100);
  }, [data]);

  if (user != null && !canAccessUKT) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 p-6">
        <p className="text-center text-zinc-400">
          Akses dibatasi. Menu UKT (Ujian Kenaikan Tingkat) hanya untuk level struktural 2–5 (Ranting, Cabang, Pengprov, PP).
        </p>
        <Link
          href="/dashboard/home-base"
          className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10"
        >
          Kembali ke Dashboard
        </Link>
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

  const r = data;

  /** Format angka dengan pemisah ribuan */
  const fmt = (n: number) => n.toLocaleString("id-ID");

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

      {/* KPI Cards — langsung di bawah header; skeleton saat loading */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          [1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-5 animate-pulse"
              aria-hidden
            >
              <div className="h-3 w-20 rounded bg-white/10" />
              <div className="mt-3 h-8 w-14 rounded bg-white/10" />
            </div>
          ))
        ) : r ? (
          <>
            <div className={`rounded-xl p-5 shadow-sm backdrop-blur-sm ${UKT_KPI_ACCENTS.ujian.card}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className={`text-xs font-medium uppercase tracking-wider ${UKT_KPI_ACCENTS.ujian.label}`}>
                    Total Ranting yang ikut ujian
                  </p>
                  <p className={`mt-1 text-2xl font-bold tabular-nums ${UKT_KPI_ACCENTS.ujian.value}`}>
                    {fmt(r.totalRantingIkutUjian ?? 0)}
                  </p>
                </div>
                <Award className={`h-9 w-9 shrink-0 opacity-80 ${UKT_KPI_ACCENTS.ujian.icon}`} />
              </div>
            </div>
            <div className={`rounded-xl p-5 shadow-sm backdrop-blur-sm ${UKT_KPI_ACCENTS.peserta.card}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className={`text-xs font-medium uppercase tracking-wider ${UKT_KPI_ACCENTS.peserta.label}`}>
                    Total Peserta
                  </p>
                  <p className={`mt-1 text-2xl font-bold tabular-nums ${UKT_KPI_ACCENTS.peserta.value}`}>
                    {fmt(r.totalPeserta)}
                  </p>
                </div>
                <Users className={`h-9 w-9 shrink-0 opacity-80 ${UKT_KPI_ACCENTS.peserta.icon}`} />
              </div>
            </div>
            <div className={`rounded-xl p-5 shadow-sm backdrop-blur-sm ${UKT_KPI_ACCENTS.lulus.card}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className={`text-xs font-medium uppercase tracking-wider ${UKT_KPI_ACCENTS.lulus.label}`}>
                    Peserta Lulus
                  </p>
                  <p className={`mt-1 text-2xl font-bold tabular-nums ${UKT_KPI_ACCENTS.lulus.value}`}>
                    {fmt(r.pesertaLulus)}
                  </p>
                </div>
                <TrendingUp className={`h-9 w-9 shrink-0 opacity-80 ${UKT_KPI_ACCENTS.lulus.icon}`} />
              </div>
            </div>
            <div className={`rounded-xl p-5 shadow-sm backdrop-blur-sm ${UKT_KPI_ACCENTS.rate.card}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className={`text-xs font-medium uppercase tracking-wider ${UKT_KPI_ACCENTS.rate.label}`}>
                    Tingkat Kelulusan
                  </p>
                  <p className={`mt-1 text-2xl font-bold tabular-nums ${UKT_KPI_ACCENTS.rate.value}`}>
                    {tingkatKelulusan != null ? `${tingkatKelulusan}%` : "—"}
                  </p>
                </div>
                <BarChart3 className={`h-9 w-9 shrink-0 opacity-80 ${UKT_KPI_ACCENTS.rate.icon}`} />
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Daftar Ranting yang ikut ujian */}
      {r?.listRantingIkutUjian && r.listRantingIkutUjian.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-zinc-200">
            Daftar Ranting yang ikut ujian
          </h3>
          <ul className="flex flex-wrap gap-2">
            {r.listRantingIkutUjian.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-amber-500/20 bg-amber-950/20 px-3 py-1.5 text-sm text-amber-200/90"
              >
                {item.nama}
              </li>
            ))}
          </ul>
        </div>
      )}

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

      {loading ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] py-12 text-center text-sm text-zinc-500">
          Memuat ringkasan…
        </div>
      ) : view === "pendaftaran" ? (
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
      ) : view === "ringkasan" && r ? (
        <div className="space-y-8">
          {/* Grafik: Pie Lulus + Bar Status */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-sm">
              <h3 className="mb-1 text-sm font-semibold text-zinc-200">Hasil Peserta</h3>
              <p className="mb-4 text-xs text-zinc-500">Lulus vs tidak lulus (ujian_hasil)</p>
              {chartLulusData.length === 0 ? (
                <div className="flex h-[240px] items-center justify-center text-sm text-zinc-500">
                  Belum ada data hasil
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={chartLulusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {chartLulusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} stroke="rgba(0,0,0,0.2)" strokeWidth={1} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "rgb(24 24 27)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                      formatter={(value: number) => [value, ""]}
                      labelFormatter={(name) => name}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-sm">
              <h3 className="mb-1 text-sm font-semibold text-zinc-200">Ujian per Status</h3>
              <p className="mb-4 text-xs text-zinc-500">10 ujian terbaru dikelompokkan status</p>
              {chartStatusData.length === 0 ? (
                <div className="flex h-[240px] items-center justify-center text-sm text-zinc-500">
                  Belum ada data ujian
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chartStatusData} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <XAxis type="number" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={70} tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "rgb(24 24 27)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                      formatter={(value: number) => [value, "Ujian"]}
                    />
                    <Bar dataKey="jumlah" radius={[0, 4, 4, 0]} maxBarSize={28}>
                      {chartStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Tabel: Ujian terbaru & Hasil terbaru */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-sm">
              <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-zinc-100">
                <ClipboardList className="h-5 w-5 text-amber-500/80" />
                Ujian terbaru
              </h2>
              <p className="mb-4 text-xs text-zinc-500">Riwayat ujian (tabel ujian)</p>
              {r.ujianTerbaru.length === 0 ? (
                <p className="rounded-lg border border-white/5 bg-white/[0.02] p-4 text-center text-sm text-zinc-500">
                  Belum ada data ujian
                </p>
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
                                  ? "rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400"
                                  : row.status === "dibuka"
                                    ? "rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400"
                                    : "text-zinc-500 text-xs"
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
            <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-sm">
              <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-zinc-100">
                <FileCheck className="h-5 w-5 text-amber-500/80" />
                Hasil terbaru
              </h2>
              <p className="mb-4 text-xs text-zinc-500">Riwayat hasil (tabel ujian_hasil)</p>
              {r.hasilTerbaru.length === 0 ? (
                <p className="rounded-lg border border-white/5 bg-white/[0.02] p-4 text-center text-sm text-zinc-500">
                  Belum ada hasil ujian
                </p>
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
                          <td className="px-4 py-3 font-medium text-zinc-200">
                            {row.nilai} / {row.nilai_maks}
                          </td>
                          <td className="px-4 py-3 text-zinc-400">{row.target_tingkat || "—"}</td>
                          <td className="px-4 py-3">
                            <span
                              className={
                                row.lulus
                                  ? "rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400"
                                  : "rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400"
                              }
                            >
                              {row.lulus ? "Lulus" : "Tidak lulus"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-zinc-500 text-xs">
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
      ) : null}

    </div>
  );
}
