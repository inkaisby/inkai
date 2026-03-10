"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  BarChart3,
  ChevronDown,
  ChevronUp,
  FileText,
  QrCode,
  Settings2,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { useScope } from "@/app/dashboard/components/topbar-premium/context/ScopeContext";
import { useBootstrapStore } from "@/app/dashboard/store/bootstrapStore";
import { getPrefetch } from "@/app/dashboard/lib/prefetchCache";
import { supabaseBrowser as supabase } from "@/app/lib/supabaseBrowser";
import PendaftaranUKT from "./components/PendaftaranUKT";
import KelolaUKTCabang from "./components/KelolaUKTCabang";
import KwitansiRantingModal from "./components/KwitansiRantingModal";
import RingkasanLaporan from "./components/RingkasanLaporan";

const ROOT_EMAIL =
  process.env.NEXT_PUBLIC_INKAI_ROOT_EMAIL?.toLowerCase() ?? null;

function getMaxLevel(
  user: {
    structural_roles?: { structural_level: number; active?: boolean }[];
    profile_structural_level?: number | null;
  } | null,
): number {
  if (!user) return 0;
  const fromRoles = (user.structural_roles ?? [])
    .filter((r) => r.active !== false)
    .map((r) => r.structural_level ?? 0);
  const fromProfile =
    user.profile_structural_level != null
      ? [user.profile_structural_level]
      : [];
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
  ujian: {
    card: "border border-amber-500/20 bg-amber-950/30",
    value: "text-amber-200",
    icon: "text-amber-400",
    label: "text-amber-300/80",
  },
  peserta: {
    card: "border border-teal-500/20 bg-teal-950/30",
    value: "text-teal-200",
    icon: "text-teal-400",
    label: "text-teal-300/80",
  },
  lulus: {
    card: "border border-emerald-500/20 bg-emerald-950/30",
    value: "text-emerald-200",
    icon: "text-emerald-400",
    label: "text-emerald-300/80",
  },
  rate: {
    card: "border border-violet-500/20 bg-violet-950/30",
    value: "text-violet-200",
    icon: "text-violet-400",
    label: "text-violet-300/80",
  },
} as const;

export default function AuditUjianModule() {
  const { scope } = useScope();
  const user = useBootstrapStore((s) => s.data?.user ?? null);
  const canAccessUKT = useMemo(() => {
    if (!user) return false;
    if (ROOT_EMAIL && (user.email?.toLowerCase() ?? "") === ROOT_EMAIL)
      return true;
    if ((user.app_role ?? "").toUpperCase() === "SUPERADMIN") return true;
    const maxLevel = getMaxLevel(user);
    return maxLevel >= 2 && maxLevel <= 5;
  }, [user]);

  const [data, setData] = useState<Ringkasan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewAudit>("pendaftaran");
  const [filterTahunId, setFilterTahunId] = useState("");
  const [filterRantingId, setFilterRantingId] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [kelolaUktExpanded, setKelolaUktExpanded] = useState(false);
  const [kwitansiRantingOpen, setKwitansiRantingOpen] = useState(false);

  const handleFilterChange = useCallback(
    (tahunId: string, rantingId: string) => {
      setFilterTahunId(tahunId);
      setFilterRantingId(rantingId);
    },
    [],
  );

  const handleRegistrationSuccess = useCallback(() => {
    setRefreshTrigger((r) => r + 1);
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

  // Realtime: ketika pendaftaran UKT berubah (daftar, batal, verifikasi, dll.) dari tab/window lain, ringkasan dan tabel pendaftaran ikut ter-update
  useEffect(() => {
    const channel = supabase
      .channel("ukt_pendaftaran_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ukt_pendaftaran",
        },
        () => {
          fetch("/api/ukt/ringkasan", { credentials: "include" })
            .then((res) => (res.ok ? res.json() : null))
            .then((json) => {
              if (json != null) setData(json);
            })
            .catch(() => {});
          setRefreshTrigger((r) => r + 1);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const tingkatKelulusan = useMemo(() => {
    if (!data || data.totalPeserta <= 0) return null;
    return Math.round((data.pesertaLulus / data.totalPeserta) * 100);
  }, [data]);

  if (user != null && !canAccessUKT) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 p-6">
        <p className="text-center text-zinc-400">
          Akses dibatasi. Menu UKT (Ujian Kenaikan Tingkat) hanya untuk level
          struktural 2–5 (Ranting, Cabang, Pengprov, PP).
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
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
                UKT (Ujian Kenaikan Tingkat)
              </h1>
              <p className="mt-0.5 text-sm text-zinc-500">
                Ringkasan UKT, peserta, dan hasil dari tabel ujian,
                ujian_peserta, ujian_hasil.
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
      {/* Sticky di semua layar; mobile: compact agar tabel tidak tertutup */}
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-sm border-b border-white/5 pb-3 md:pb-6 space-y-3 md:space-y-6">
      <header className="border-b border-white/10 pb-3 md:pb-6">
        <div className="flex items-center gap-2 md:gap-3">
          <Link
            href="/dashboard/home-base"
            className="flex shrink-0 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-2 text-zinc-400 transition-colors hover:border-amber-500/30 hover:bg-white/[0.06] hover:text-amber-200/90 md:rounded-xl md:px-3 md:py-2"
            title="Kembali ke Dashboard"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span className="hidden text-sm font-medium sm:inline">Kembali</span>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold tracking-tight text-zinc-100 md:text-2xl truncate">
              UKT (Ujian Kenaikan Tingkat)
            </h1>
            <p className="mt-0.5 hidden text-sm text-zinc-500 sm:block">
              Ringkasan UKT, peserta, dan hasil dari tabel ujian, ujian_peserta,
              ujian_hasil.
            </p>
          </div>
          <BarChart3 className="hidden h-9 w-9 shrink-0 text-amber-500/80 sm:block" />
        </div>
      </header>

      {/* KPI Cards — mobile: 2x2 minimal; desktop: 4 kolom */}
      <div className="grid grid-cols-2 gap-1.5 sm:gap-4 lg:grid-cols-4">
        {loading ? (
          [1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-md border border-white/10 bg-white/[0.03] p-2 animate-pulse md:rounded-xl md:p-5"
              aria-hidden
            >
              <div className="h-2 w-10 rounded bg-white/10 md:h-3 md:w-20" />
              <div className="mt-1.5 h-5 w-8 rounded bg-white/10 md:mt-3 md:h-8 md:w-14" />
            </div>
          ))
        ) : r ? (
          <>
            <div
              className={`rounded-md p-2 shadow-sm backdrop-blur-sm md:rounded-xl md:p-5 ${UKT_KPI_ACCENTS.ujian.card}`}
            >
              <div className="flex items-start justify-between gap-0.5 md:gap-2">
                <div className="min-w-0">
                  {/* Mobile: angka besar + label sejajar */}
                  <div className="flex items-baseline justify-between gap-1 md:hidden">
                    <span
                      className={`text-base font-bold tabular-nums ${UKT_KPI_ACCENTS.ujian.value}`}
                    >
                      {fmt(r.totalRantingIkutUjian ?? 0)}
                    </span>
                    <span
                      className={`text-[11px] font-medium uppercase tracking-wider ${UKT_KPI_ACCENTS.ujian.label}`}
                    >
                      Ranting ikut
                    </span>
                  </div>
                  {/* Desktop: layout lama (label di atas angka) */}
                  <div className="hidden md:block">
                    <p
                      className={`text-xs font-medium uppercase tracking-wider ${UKT_KPI_ACCENTS.ujian.label}`}
                    >
                      Total Ranting yang ikut ujian
                    </p>
                    <p
                      className={`mt-1 text-2xl font-bold tabular-nums ${UKT_KPI_ACCENTS.ujian.value}`}
                    >
                      {fmt(r.totalRantingIkutUjian ?? 0)}
                    </p>
                  </div>
                </div>
                <Award
                  className={`hidden h-4 w-4 shrink-0 opacity-80 sm:block md:h-9 md:w-9 ${UKT_KPI_ACCENTS.ujian.icon}`}
                />
              </div>
            </div>
            <div
              className={`rounded-md p-2 shadow-sm backdrop-blur-sm md:rounded-xl md:p-5 ${UKT_KPI_ACCENTS.peserta.card}`}
            >
              <div className="flex items-start justify-between gap-0.5 md:gap-2">
                <div className="min-w-0">
                  {/* Mobile: angka besar + label sejajar */}
                  <div className="flex items-baseline justify-between gap-1 md:hidden">
                    <span
                      className={`text-base font-bold tabular-nums ${UKT_KPI_ACCENTS.peserta.value}`}
                    >
                      {fmt(r.totalPeserta)}
                    </span>
                    <span
                      className={`text-[11px] font-medium uppercase tracking-wider ${UKT_KPI_ACCENTS.peserta.label}`}
                    >
                      Peserta
                    </span>
                  </div>
                  {/* Desktop: layout lama */}
                  <div className="hidden md:block">
                    <p
                      className={`text-xs font-medium uppercase tracking-wider ${UKT_KPI_ACCENTS.peserta.label}`}
                    >
                      Total Peserta
                    </p>
                    <p
                      className={`mt-1 text-2xl font-bold tabular-nums ${UKT_KPI_ACCENTS.peserta.value}`}
                    >
                      {fmt(r.totalPeserta)}
                    </p>
                  </div>
                </div>
                <Users
                  className={`hidden h-4 w-4 shrink-0 opacity-80 sm:block md:h-9 md:w-9 ${UKT_KPI_ACCENTS.peserta.icon}`}
                />
              </div>
            </div>
            <div
              className={`rounded-md p-2 shadow-sm backdrop-blur-sm md:rounded-xl md:p-5 ${UKT_KPI_ACCENTS.lulus.card}`}
            >
              <div className="flex items-start justify-between gap-0.5 md:gap-2">
                <div className="min-w-0">
                  {/* Mobile: angka besar + label sejajar */}
                  <div className="flex items-baseline justify-between gap-1 md:hidden">
                    <span
                      className={`text-base font-bold tabular-nums ${UKT_KPI_ACCENTS.lulus.value}`}
                    >
                      {fmt(r.pesertaLulus)}
                    </span>
                    <span
                      className={`text-[11px] font-medium uppercase tracking-wider ${UKT_KPI_ACCENTS.lulus.label}`}
                    >
                      Lulus
                    </span>
                  </div>
                  {/* Desktop: layout lama */}
                  <div className="hidden md:block">
                    <p
                      className={`text-xs font-medium uppercase tracking-wider ${UKT_KPI_ACCENTS.lulus.label}`}
                    >
                      Peserta Lulus
                    </p>
                    <p
                      className={`mt-1 text-2xl font-bold tabular-nums ${UKT_KPI_ACCENTS.lulus.value}`}
                    >
                      {fmt(r.pesertaLulus)}
                    </p>
                  </div>
                </div>
                <TrendingUp
                  className={`hidden h-4 w-4 shrink-0 opacity-80 sm:block md:h-9 md:w-9 ${UKT_KPI_ACCENTS.lulus.icon}`}
                />
              </div>
            </div>
            <div
              className={`rounded-md p-2 shadow-sm backdrop-blur-sm md:rounded-xl md:p-5 ${UKT_KPI_ACCENTS.rate.card}`}
            >
              <div className="flex items-start justify-between gap-0.5 md:gap-2">
                <div className="min-w-0">
                  {/* Mobile: angka besar + label sejajar */}
                  <div className="flex items-baseline justify-between gap-1 md:hidden">
                    <span
                      className={`text-base font-bold tabular-nums ${UKT_KPI_ACCENTS.rate.value}`}
                    >
                      {tingkatKelulusan != null ? `${tingkatKelulusan}%` : "—"}
                    </span>
                    <span
                      className={`text-[11px] font-medium uppercase tracking-wider ${UKT_KPI_ACCENTS.rate.label}`}
                    >
                      Kelulusan
                    </span>
                  </div>
                  {/* Desktop: layout lama */}
                  <div className="hidden md:block">
                    <p
                      className={`text-xs font-medium uppercase tracking-wider ${UKT_KPI_ACCENTS.rate.label}`}
                    >
                      Tingkat Kelulusan
                    </p>
                    <p
                      className={`mt-1 text-2xl font-bold tabular-nums ${UKT_KPI_ACCENTS.rate.value}`}
                    >
                      {tingkatKelulusan != null ? `${tingkatKelulusan}%` : "—"}
                    </p>
                  </div>
                </div>
                <BarChart3
                  className={`hidden h-4 w-4 shrink-0 opacity-80 sm:block md:h-9 md:w-9 ${UKT_KPI_ACCENTS.rate.icon}`}
                />
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Daftar Ranting — sembunyikan di mobile untuk hemat ruang */}
      {r?.listRantingIkutUjian && r.listRantingIkutUjian.length > 0 && (
        <div className="hidden rounded-xl border border-white/10 bg-white/[0.03] p-5 shadow-sm md:block">
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

      <nav className="flex flex-wrap gap-1.5 md:gap-2">
        <button
          type="button"
          onClick={() => setView("pendaftaran")}
          className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition md:gap-2 md:px-5 md:py-2.5 md:text-sm ${
            view === "pendaftaran"
              ? "bg-teal-500/20 text-teal-200 shadow-sm border border-teal-400/25"
              : "bg-white/[0.04] text-zinc-500 border border-transparent hover:bg-teal-500/10 hover:text-teal-300/90 hover:border-teal-400/15"
          }`}
        >
          <UserPlus className="h-3.5 w-3.5 shrink-0 md:h-4 md:w-4" />
          <span className="hidden sm:inline">Pendaftaran & Kelola UKT</span>
          <span className="sm:hidden">Pendaftaran</span>
        </button>
        <button
          type="button"
          onClick={() => setView("ringkasan")}
          className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition md:gap-2 md:px-5 md:py-2.5 md:text-sm ${
            view === "ringkasan"
              ? "bg-amber-500/20 text-amber-200 shadow-sm border border-amber-400/25"
              : "bg-white/[0.04] text-zinc-500 border border-transparent hover:bg-amber-500/10 hover:text-amber-300/90 hover:border-amber-400/15"
          }`}
        >
          <BarChart3 className="h-3.5 w-3.5 shrink-0 md:h-4 md:w-4" />
          Ringkasan
        </button>
        <Link
          href="/dashboard/ukt/scan"
          className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-zinc-400 transition hover:bg-teal-500/10 hover:text-teal-300/90 hover:border-teal-400/15 md:gap-2 md:px-5 md:py-2.5 md:text-sm"
        >
          <QrCode className="h-3.5 w-3.5 shrink-0 md:h-4 md:w-4" />
          Scan QR
        </Link>
        <button
          type="button"
          onClick={() => setKwitansiRantingOpen(true)}
          className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-zinc-400 transition hover:bg-teal-500/10 hover:text-teal-300/90 hover:border-teal-400/15 md:gap-2 md:px-5 md:py-2.5 md:text-sm"
        >
          <FileText className="h-3.5 w-3.5 shrink-0 md:h-4 md:w-4" />
          Kwitansi
        </button>
      </nav>
      <p className="hidden text-xs text-zinc-500 md:block">
        Scan QR untuk verifikasi kwitansi per orang; Kwitansi per Ranting untuk
        laporan agregat (A, B, C).
      </p>
      </div>

      <KwitansiRantingModal
        open={kwitansiRantingOpen}
        onClose={() => setKwitansiRantingOpen(false)}
      />

      <div className="pt-6">
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
                    <h2 className="text-base font-semibold text-zinc-100">
                      Kelola UKT
                    </h2>
                    <p className="text-sm text-zinc-500">
                      Atur tahun ajaran, biaya per kyu, dan tutup tahun.
                    </p>
                  </div>
                </div>
                <span className="text-zinc-400 shrink-0">
                  {kelolaUktExpanded ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </span>
              </button>
              {kelolaUktExpanded && (
                <div className="border-t border-white/10 px-6 pb-6 pt-2">
                  <KelolaUKTCabang />
                </div>
              )}
            </section>
          )}
          {/* Pendaftaran peserta UKT (panel kanan Laporan dihapus) */}
          <div className="min-w-0 w-full">
            <PendaftaranUKT
              onFilterChange={handleFilterChange}
              onRegistrationSuccess={handleRegistrationSuccess}
              refreshTrigger={refreshTrigger}
            />
          </div>
        </div>
      ) : view === "ringkasan" ? (
        <RingkasanLaporan />
      ) : null}
      </div>
    </div>
  );
}
