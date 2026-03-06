"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Users,
  UserCheck,
  Trophy,
  Calendar,
  GraduationCap,
  CreditCard,
  ClipboardList,
  BarChart3,
  Settings,
  Instagram,
  ShoppingBag,
  Heart,
  MessageCircle,
  Share2,
  ExternalLink,
} from "lucide-react";
import { useScope } from "@/app/dashboard/components/topbar-premium/context/ScopeContext";
import { useBootstrapStore } from "@/app/dashboard/store/bootstrapStore";

/* ================= TYPES ================= */
type RantingItem = {
  id: string;
  nama: string;
  aktif?: boolean;
  province_id?: number | null;
  regency_id?: number | null;
  district_id?: number | null;
  instagram_url?: string | null;
};

type FeedPost = {
  id: string;
  title: string;
  body: string;
  image?: string | null;
  date: string;
  likes: number;
  type: "event" | "pengumuman" | "dojo";
};

type MarketplaceItem = {
  id: string;
  title: string;
  price: string;
  image?: string | null;
  href: string;
};

/* ================= MOCK DATA ================= */
const mockFeed: FeedPost[] = [
  {
    id: "1",
    title: "Gashuku Nasional 2025",
    body: "Pendaftaran dibuka. Ayo daftar dan raih pengalaman berlatih bersama seluruh anggota INKAI.",
    image: null,
    date: "2 jam",
    likes: 24,
    type: "event",
  },
  {
    id: "2",
    title: "Pengumuman Ujian Kyu",
    body: "Ujian kyu periode Maret akan dilaksanakan di dojo masing-masing. Silakan koordinasi dengan pelatih.",
    image: null,
    date: "1 hari",
    likes: 12,
    type: "pengumuman",
  },
  {
    id: "3",
    title: "Jadwal Latihan Pekan Ini",
    body: "Senin–Jumat 16.00–18.00, Sabtu 08.00–10.00. Tetap semangat!",
    image: null,
    date: "2 hari",
    likes: 8,
    type: "dojo",
  },
];

const mockMarketplace: MarketplaceItem[] = [
  { id: "m1", title: "Seragam INKAI", price: "Rp 350.000", image: null, href: "/dashboard" },
  { id: "m2", title: "Sabuk Latihan", price: "Rp 85.000", image: null, href: "/dashboard" },
  { id: "m3", title: "Buku Panduan Kyu", price: "Rp 75.000", image: null, href: "/dashboard" },
  { id: "m4", title: "Tas Dojo", price: "Rp 120.000", image: null, href: "/dashboard" },
];

/* Palet utama: teal/cyan + amber — elegan, tidak norak */
const storyAccents = ["teal", "amber", "slate"] as const;

/* ================= STATS & MODULES ================= */
const stats = [
  { label: "Total Siswa", value: "—", href: "/dashboard/siswa", accent: "teal", icon: Users },
  { label: "Anggota Aktif", value: "—", href: "/dashboard/keanggotaan", accent: "emerald", icon: UserCheck },
  { label: "Event Aktif", value: "—", href: "/dashboard/event", accent: "amber", icon: Trophy },
  { label: "Jadwal Terdekat", value: "—", href: "/dashboard/jadwal", accent: "slate", icon: Calendar },
];

const modules = [
  { title: "Manajemen Siswa", desc: "Data siswa, status, wilayah, kartu digital", href: "/dashboard/siswa", accent: "teal", icon: GraduationCap },
  { title: "Keanggotaan", desc: "Kyu, Dan, mutasi, kartu anggota", href: "/dashboard/keanggotaan", accent: "emerald", icon: UserCheck },
  { title: "Absensi", desc: "Harian & rekap kehadiran", href: "/dashboard/absensi", accent: "teal", icon: ClipboardList },
  { title: "Event & Ujian", desc: "Gashuku, kejuaraan, ujian", href: "/dashboard/event", accent: "amber", icon: Trophy },
  { title: "Keuangan", desc: "Iuran & transaksi", href: "/dashboard/keuangan", accent: "emerald", icon: CreditCard },
  { title: "Penilaian", desc: "Nilai teknik & fisik", href: "/dashboard/penilaian", accent: "slate", icon: BarChart3 },
  { title: "Pengguna", desc: "User, role, permission", href: "/dashboard/user", accent: "slate", icon: Users },
  { title: "Pengaturan", desc: "Sistem & keamanan", href: "/dashboard/settings", accent: "slate", icon: Settings },
];

const accentStyles: Record<string, { card: string; border: string; text: string; icon: string }> = {
  teal: { card: "bg-teal-500/10", border: "border-teal-500/25", text: "text-teal-200", icon: "text-teal-400" },
  emerald: { card: "bg-emerald-500/10", border: "border-emerald-500/25", text: "text-emerald-200", icon: "text-emerald-400" },
  amber: { card: "bg-amber-500/10", border: "border-amber-500/25", text: "text-amber-200", icon: "text-amber-400" },
  slate: { card: "bg-slate-500/10", border: "border-slate-500/25", text: "text-slate-200", icon: "text-slate-400" },
};

const feedPostStyles: Record<FeedPost["type"], { leftBar: string; placeholder: string }> = {
  event: { leftBar: "bg-amber-500/60", placeholder: "from-amber-950/50 to-transparent" },
  pengumuman: { leftBar: "bg-teal-500/60", placeholder: "from-teal-950/50 to-transparent" },
  dojo: { leftBar: "bg-emerald-500/60", placeholder: "from-emerald-950/50 to-transparent" },
};

/* ================= COMPONENT ================= */
/** Statistik & Akses Cepat Modul untuk: superadmin, ketua per wilayah (scope), atau user level 2+ (Ketua Ranting ke atas). */
function useShowAdminDashboard() {
  const { scope, app_role, loading } = useScope();
  const { data: bootstrap } = useBootstrapStore();
  const user = bootstrap?.user ?? null;

  const isSuperadmin = (app_role ?? "").toUpperCase() === "SUPERADMIN";
  const isKetuaWilayah =
    scope != null &&
    (scope.is_pp ||
      (scope.ranting_ids?.length ?? 0) > 0 ||
      (scope.cabang_ids?.length ?? 0) > 0 ||
      (scope.provinsi_ids?.length ?? 0) > 0);

  const fromRoles = user?.structural_roles?.filter((r) => r.active).map((r) => r.structural_level) ?? [];
  const fromProfile = user?.profile_structural_level != null ? [user.profile_structural_level] : [];
  const allLevels = [...fromRoles, ...fromProfile];
  const maxLevel = allLevels.length ? Math.max(...allLevels) : 0;
  const isLevel2Plus = maxLevel >= 2;

  return !loading && (isSuperadmin || isKetuaWilayah || isLevel2Plus);
}

export default function DashboardHome() {
  const [rantingList, setRantingList] = useState<RantingItem[]>([]);
  const [rantingLoading, setRantingLoading] = useState(true);
  const showAdminDashboard = useShowAdminDashboard();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ranting", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) return [];
        try {
          const text = await res.text();
          return text.trim() ? (JSON.parse(text) as RantingItem[]) : [];
        } catch {
          return [];
        }
      })
      .then((data: RantingItem[]) => {
        if (!cancelled && Array.isArray(data)) setRantingList(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setRantingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Link Instagram per ranting: pakai instagram_url dari DB, fallback ke default */
  const getInstagramUrl = (ranting: RantingItem) => {
    const url = ranting?.instagram_url?.trim();
    if (url) return url;
    return typeof process.env.NEXT_PUBLIC_INSTAGRAM_BASE_URL !== "undefined"
      ? process.env.NEXT_PUBLIC_INSTAGRAM_BASE_URL
      : "https://instagram.com";
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-6 sm:pb-8">
      {/* Header — elegan, satu aksen */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-wide">
          Home
        </h1>
        <p className="text-sm text-white/60 mt-1">
          Ringkasan, feed, Instagram per wilayah, dan marketplace
        </p>
      </div>

      {/* Stories — teal/amber/slate halus, tidak ramai */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="text-sm font-medium text-white/90 mb-3">Stories — Ranting / Dojo</h2>
        <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-1 -mx-1">
          {rantingLoading ? (
            <div className="flex gap-3 sm:gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex-shrink-0 w-[72px] sm:w-16 animate-pulse">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/10 border border-white/10" />
                  <div className="h-3 mt-2 w-12 bg-white/10 rounded" />
                </div>
              ))}
            </div>
          ) : (
            rantingList.slice(0, 12).map((r, i) => {
              const acc = storyAccents[i % storyAccents.length];
              const ring = acc === "teal" ? "border-teal-400/40" : acc === "amber" ? "border-amber-400/40" : "border-slate-400/40";
              return (
                <a
                  key={r.id}
                  href={getInstagramUrl(r)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 flex flex-col items-center gap-1.5 sm:gap-2 no-underline group min-w-[72px] sm:min-w-0"
                >
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 ${ring} bg-white/5 flex items-center justify-center text-white/90 font-medium text-base sm:text-lg group-hover:bg-white/10 transition-colors`}>
                    {r.nama?.charAt(0)?.toUpperCase() ?? "?"}
                  </div>
                  <span className="text-[11px] sm:text-xs text-white/70 max-w-[72px] sm:max-w-[64px] truncate text-center px-0.5" title={r.nama}>
                    {r.nama}
                  </span>
                </a>
              );
            })
          )}
          {!rantingLoading && rantingList.length === 0 && (
            <p className="text-sm text-white/50 py-2">Belum ada ranting. Hubungi admin.</p>
          )}
        </div>
      </div>

      {/* Layout: Feed + Sidebar — satu gaya kartu, aksen halus */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-sm font-medium text-white/90">Feed</h2>
          <div className="space-y-4">
            {mockFeed.map((post) => {
              const style = feedPostStyles[post.type];
              return (
                <article
                  key={post.id}
                  className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden"
                >
                  <div className="flex">
                    <div className={`w-1 flex-shrink-0 ${style.leftBar}`} />
                    <div className="flex-1 min-w-0">
                      <div className="p-4 flex items-center gap-3 border-b border-white/5">
                        <div className="w-9 h-9 rounded-full bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300 text-sm font-medium">
                          INKAI
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white/95">{post.title}</div>
                          <div className="text-xs text-white/50">{post.date}</div>
                        </div>
                      </div>
                      {post.image ? (
                        <div className="aspect-video bg-black/30 relative">
                          <Image src={post.image} alt="" fill className="object-cover" />
                        </div>
                      ) : (
                        <div className={`aspect-video bg-gradient-to-br ${style.placeholder} flex items-center justify-center`}>
                          <Trophy className="w-10 h-10 text-white/30" />
                        </div>
                      )}
                      <div className="p-4">
                        <p className="text-sm text-white/80">{post.body}</p>
                        <div className="flex items-center gap-4 mt-3 text-white/50 text-sm">
                          <button type="button" className="flex items-center gap-1.5 hover:text-white/70 transition-colors">
                            <Heart size={16} />
                            {post.likes}
                          </button>
                          <button type="button" className="flex items-center gap-1.5 hover:text-white/70 transition-colors">
                            <MessageCircle size={16} />
                            Komentar
                          </button>
                          <button type="button" className="flex items-center gap-1.5 hover:text-white/70 transition-colors">
                            <Share2 size={16} />
                            Bagikan
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {/* Sidebar — statistik hanya untuk ketua per wilayah; user biasa tidak lihat */}
        <div className="space-y-6">
          {showAdminDashboard && (
            <div className="grid grid-cols-2 gap-2">
              {stats.map((s) => {
                const Icon = s.icon;
                const st = accentStyles[s.accent] ?? accentStyles.slate;
                return (
                  <Link
                    key={s.label}
                    href={s.href}
                    className={`rounded-lg p-3 border ${st.border} ${st.card} hover:bg-white/[0.06] transition-colors no-underline`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/70">{s.label}</span>
                      <Icon size={16} className={st.icon} />
                    </div>
                    <div className={`text-lg font-semibold ${st.text} mt-0.5`}>{s.value}</div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Instagram per wilayah — border halus */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <h2 className="text-sm font-medium text-white/90 flex items-center gap-2 mb-2">
              <Instagram size={16} className="text-white/60" />
              Instagram per Wilayah
            </h2>
            <p className="text-xs text-white/50 mb-3">
              Akun Instagram ranting/dojo per wilayah.
            </p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {rantingLoading ? (
                <div className="text-xs text-white/40">Memuat...</div>
              ) : (
                rantingList.slice(0, 8).map((r) => (
                  <a
                    key={r.id}
                    href={getInstagramUrl(r)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-transparent hover:border-teal-500/20 transition-colors no-underline text-white/80 text-sm"
                  >
                    <span className="truncate">{r.nama}</span>
                    <ExternalLink size={12} className="flex-shrink-0 text-white/40" />
                  </a>
                ))
              )}
              {!rantingLoading && rantingList.length === 0 && (
                <p className="text-xs text-white/40">Belum ada ranting.</p>
              )}
            </div>
          </div>

          {/* Marketplace — satu gaya, aksen teal & amber */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <h2 className="text-sm font-medium text-white/90 flex items-center gap-2 mb-2">
              <ShoppingBag size={16} className="text-white/60" />
              Marketplace
            </h2>
            <p className="text-xs text-white/50 mb-3">
              Seragam, sabuk, dan perlengkapan dojo.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {mockMarketplace.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="block rounded-lg border border-white/10 bg-white/[0.04] p-2.5 hover:bg-white/[0.07] hover:border-teal-500/20 transition-colors no-underline"
                >
                  <div className="aspect-square rounded bg-white/5 flex items-center justify-center mb-1.5">
                    <ShoppingBag className="w-6 h-6 text-teal-400/60" />
                  </div>
                  <div className="text-xs font-medium text-white/90 truncate">{item.title}</div>
                  <div className="text-xs text-amber-400/90 mt-0.5">{item.price}</div>
                </Link>
              ))}
            </div>
            <Link
              href="/dashboard"
              className="mt-2.5 block text-center text-xs text-teal-400 hover:text-teal-300 no-underline"
            >
              Lihat semua →
            </Link>
          </div>
        </div>
      </div>

      {/* Akses Cepat Modul — hanya untuk ketua per wilayah; user biasa tidak lihat */}
      {showAdminDashboard && (
        <div>
          <h2 className="text-sm font-medium text-white/90 mb-3">Akses Cepat Modul</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {modules.map((m) => {
              const Icon = m.icon;
              const st = accentStyles[m.accent] ?? accentStyles.slate;
              return (
                <Link
                  key={m.title}
                  href={m.href}
                  className={`flex items-center gap-4 rounded-xl border ${st.border} ${st.card} p-4 hover:bg-white/[0.05] transition-colors no-underline`}
                >
                  <div className={`h-10 w-10 flex items-center justify-center rounded-lg border ${st.border} ${st.icon}`}>
                    <Icon size={20} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white/95">{m.title}</div>
                    <div className="text-sm text-white/55 mt-0.5">{m.desc}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer — minimal */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/50">
        Home — Stories ranting, feed, Instagram per wilayah, dan marketplace.
      </div>
    </div>
  );
}
