"use client";

import { motion } from "framer-motion";
import { Menu } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { usePathname } from "next/navigation";

import { NotificationProvider } from "./context/NotificationContext";
import { useBootstrapStore } from "../../store/bootstrapStore";

import TitleDynamic from "./components/TitleDynamic";
import NotificationNode from "./components/NotificationNode";
import MarketplaceCartNode from "./components/MarketplaceCartNode";
import AvatarMenu from "./components/AvatarMenu";
import NotificationPanel from "./components/NotificationPanel";

const ROLE_MAP: Record<string, string> = {
  SUPERADMIN: "Superadmin",
  ADMIN: "Admin",
  USER: "User",
  KETUA_PP: "Ketua PP",
  KETUA_CABANG: "Ketua Cabang",
  KETUA_RANTING: "Ketua Ranting",
  PENGPROV: "Pengprov",
  SEKRETARIS: "Sekretaris",
  BENDAHARA: "Bendahara",
};

function formatRole(r: string) {
  return ROLE_MAP[r] ?? r.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ====================================================== */
export default function TopbarContainer() {
  return (
    <NotificationProvider>
      <TopbarContent />
    </NotificationProvider>
  );
}

/* ====================================================== */
function TopbarContent() {
  const pathname = usePathname();
  const user = useBootstrapStore((s) => s.data?.user ?? null);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  const { userLabel, jabatan } = useMemo(() => {
    if (!user) return { userLabel: null as string | null, jabatan: null as string | null };
    const nama = user.nama && String(user.nama).trim() !== "" ? String(user.nama).trim() : user.email ?? "Pengguna";
    const structural = (user.structural_roles ?? []) as Array<{ role_name?: string; structural_level?: number; active?: boolean }>;
    const activeStructural = structural.filter((r) => r.active !== false);
    const top = activeStructural.sort((a, b) => (b.structural_level ?? 0) - (a.structural_level ?? 0))[0];
    let jabatanVal: string | null = null;
    if ((user.app_role ?? "").toUpperCase() === "SUPERADMIN") jabatanVal = "Superadmin";
    else if (top?.role_name) jabatanVal = formatRole(top.role_name);
    else if (user.app_role) jabatanVal = formatRole(user.app_role);
    const userLabelVal = jabatanVal ? `${nama} · ${jabatanVal}` : nama;
    return { userLabel: userLabelVal, jabatan: jabatanVal };
  }, [user]);

  // 🔥 TITLE TANPA QUERY DATABASE (suffix responsive di TitleDynamic)
  const title = useMemo(() => {
    if (pathname === "/dashboard") return "Home";
    const segments = pathname.split("/").filter(Boolean);
    const key = segments[1];
    if (!key) return "Home";
    if (key === "home-base") return "Dashboard";
    if (key === "ukt" || key === "ujian" || key === "audit-ujian") return "UKT (Ujian Kenaikan Tingkat)";
    return key.replace(/-/g, " ").toUpperCase();
  }, [pathname]);

  const Header = mounted ? motion.header : "header";

  return (
    <>
      <Header
        {...(mounted
          ? {
              initial: false,
              animate: { opacity: 1, y: 0 },
              transition: { duration: 0.25 },
            }
          : {})}
        className="relative z-40 w-full h-16 px-4 flex items-center bg-[#0a0a0a]/90 backdrop-blur-md border-b border-cyan-500/20 shadow-[0_1px_0_rgba(34,211,238,0.08)]"
      >
        {/* FX RINGAN (boleh disable total jika perlu) */}
        {/* <HologramBorder /> */}
        {/* <HologramScanline /> */}
        {/* <GoldCyanFX /> */}

        <div className="flex items-center gap-2 sm:gap-3 z-10 min-w-0 flex-1 pr-52 sm:pr-80">
          <button
            type="button"
            suppressHydrationWarning
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("toggle-sidebar", { detail: true }),
              )
            }
            className="flex-shrink-0 p-2 rounded-lg text-cyan-300/90 hover:text-cyan-200 hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Toggle sidebar"
          >
            <Menu size={20} />
          </button>

          <div className="min-w-0 flex-1 truncate">
            <TitleDynamic title={title} />
          </div>
        </div>
      </Header>

      {/* HUD — nama/jabatan + notifikasi + avatar */}
      <div className="fixed top-3 right-3 sm:right-6 z-50 flex items-center gap-2 sm:gap-3 pointer-events-auto">
        {/* Mobile: hanya jabatan. Desktop: nama · jabatan */}
        {jabatan && (
          <span
            className="sm:hidden text-sm text-cyan-200/90 truncate max-w-[120px]"
            title={jabatan}
          >
            {jabatan}
          </span>
        )}
        {userLabel && (
          <span
            className="hidden sm:block text-sm text-cyan-200/90 truncate max-w-[180px]"
            title={userLabel}
          >
            {userLabel}
          </span>
        )}
        <MarketplaceCartNode />
        <NotificationNode />
        <AvatarMenu />
      </div>

      <NotificationPanel />
    </>
  );
}
