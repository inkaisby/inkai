"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

import Sidebar from "./components/dashboard/Sidebar";
import TopbarContainer from "./components/topbar-premium/TopbarContainer";
import ProfileModal from "./components/topbar-premium/profile/ProfileModal";
import SettingsModalProvider from "./components/topbar-premium/profile/settings/modal/SettingsModalProvider";
import { ScopeProvider } from "./components/topbar-premium/context/ScopeContext";
import useProfileModal from "./components/topbar-premium/profile/useProfileModal";
import { useBootstrapStore, type BootstrapData } from "./store/bootstrapStore";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { setBootstrap, setLoading, getValid, rehydrateFromStorage } = useBootstrapStore();

  const hideSidebar =
    pathname.startsWith("/dashboard/auth") ||
    pathname.startsWith("/dashboard/print") ||
    pathname.startsWith("/dashboard/fullscreen");

  /* ======================================================
   * BOOTSTRAP: satu fetch session + menu, isi store, jalankan auth gate
   * ====================================================== */
  useEffect(() => {
    let active = true;

    const run = async () => {
      rehydrateFromStorage();
      const cached = getValid();
      if (cached) {
        if (!cached.user?.email_allowed) return;
        if (!cached.profile_completed) {
          useProfileModal.getState().openForced();
        }
        return;
      }

      setLoading(true);
      const res = await fetch("/api/sidebar/menus", { credentials: "include" });
      if (!active) return;
      if (!res.ok) {
        setLoading(false);
        return;
      }
      let json: {
        user?: { email_allowed?: boolean; [k: string]: unknown };
        menus?: unknown[];
        profile_completed?: boolean;
      } = {};
      try {
        const text = await res.text();
        if (text.trim()) json = JSON.parse(text);
      } catch {
        setLoading(false);
        return;
      }

      const data: BootstrapData = {
        user: (json.user ?? null) as BootstrapData["user"],
        menus: json.menus ?? [],
        profile_completed: json.profile_completed ?? false,
      };
      if (active) {
        setBootstrap(data);
        if (data.user?.email_allowed !== false && !data.profile_completed) {
          useProfileModal.getState().openForced();
        }
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [getValid, setBootstrap, setLoading, rehydrateFromStorage]);

  /* Scroll hanya di area konten; halaman browser (body) tidak ikut scroll. */
  useLayoutEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] bg-black text-white overflow-hidden">
      {!hideSidebar && <Sidebar />}

      <ScopeProvider>
        <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
          <header className="flex-shrink-0">
            <TopbarContainer />
          </header>
          <ProfileModal />
          <SettingsModalProvider />
          <main
            className="dashboard-main-scroll flex-1 min-h-0 overflow-y-scroll overflow-x-hidden p-4 sm:p-6 min-w-0 overscroll-contain"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {children}
          </main>
        </div>
      </ScopeProvider>
    </div>
  );
}
