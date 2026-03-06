"use client";

import { motion } from "framer-motion";
import { Menu } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { usePathname } from "next/navigation";

import { NotificationProvider } from "./context/NotificationContext";

import TitleDynamic from "./components/TitleDynamic";
import NotificationNode from "./components/NotificationNode";
import AvatarMenu from "./components/AvatarMenu";
import ConnectionPulse from "./components/ConnectionPulse";
import NotificationPanel from "./components/NotificationPanel";
//import SettingsModalProvider from "./profile/settings/modal/SettingsModalProvider";

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

  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // 🔥 TITLE TANPA QUERY DATABASE (suffix responsive di TitleDynamic)
  const title = useMemo(() => {
    if (pathname === "/dashboard") return "Dashboard";
    const segments = pathname.split("/").filter(Boolean);
    const key = segments[1];
    if (!key) return "Dashboard";
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
        className="relative z-40 w-full h-16 px-4 flex items-center bg-[#0d0d0d]/80 border-b border-cyan-500/30"
      >
        {/* FX RINGAN (boleh disable total jika perlu) */}
        {/* <HologramBorder /> */}
        {/* <HologramScanline /> */}
        {/* <GoldCyanFX /> */}

        <div className="flex items-center gap-2 sm:gap-3 z-10 min-w-0 flex-1 pr-44 sm:pr-28">
          <button
            type="button"
            suppressHydrationWarning
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("toggle-sidebar", { detail: true }),
              )
            }
            className="flex-shrink-0 p-2 rounded text-cyan-300 hover:text-white transition cursor-pointer"
            aria-label="Toggle sidebar"
          >
            <Menu size={20} />
          </button>

          <div className="min-w-0 flex-1 truncate">
            <TitleDynamic title={title} />
          </div>
        </div>
      </Header>

      {/* HUD */}
      <div className="fixed top-3 right-3 sm:right-6 z-50 flex items-center gap-3 sm:gap-5 pointer-events-auto">
        <NotificationNode />
        <ConnectionPulse />
        <AvatarMenu />
      </div>

      <NotificationPanel />
    </>
  );
}
