"use client";

import { motion } from "framer-motion";
import { Menu, MapPin } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { usePathname } from "next/navigation";

import { NotificationProvider } from "./context/NotificationContext";
import { useScope } from "./context/ScopeContext";

import TitleDynamic from "./components/TitleDynamic";
import NotificationNode from "./components/NotificationNode";
import AvatarMenu from "./components/AvatarMenu";
import ConnectionPulse from "./components/ConnectionPulse";

import NotificationPanel from "./components/NotificationPanel";
//import ProfileModal from "./profile/ProfileModal";
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
  const { contextOptions, selectedContext, setSelectedContext, loading: scopeLoading } = useScope();

  const [mounted, setMounted] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => setMounted(true), []);

  const showKonteks = contextOptions.length > 1;

  // 🔥 TITLE TANPA QUERY DATABASE
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

        <div className="flex items-center gap-3 z-10">
          <button
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("toggle-sidebar", { detail: true }),
              )
            }
            className="p-2 rounded text-cyan-300 hover:text-white transition"
          >
            <Menu size={20} />
          </button>

          <TitleDynamic title={title} />

          {showKonteks && !scopeLoading && (
            <div className="flex items-center gap-2 ml-2">
              <MapPin size={16} className="text-cyan-400/80" />
              <select
                value={selectedContext}
                onChange={(e) => setSelectedContext(e.target.value)}
                className="text-sm bg-black/50 border border-cyan-500/40 rounded px-2 py-1 text-cyan-200 focus:outline-none focus:ring-1 focus:ring-cyan-400"
              >
                {contextOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Header>

      {/* HUD */}
      <div className="fixed top-3 right-6 z-50 flex items-center gap-5">
        <NotificationNode onClick={() => setShowNotification(true)} />
        <ConnectionPulse />
        <AvatarMenu />
      </div>

      {/* 🔥 MODAL LAZY MOUNT */}
      {showNotification && <NotificationPanel />}
    </>
  );
}
