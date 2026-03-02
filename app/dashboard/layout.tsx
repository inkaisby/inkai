"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import Sidebar from "./components/dashboard/Sidebar";
import TopbarContainer from "./components/topbar-premium/TopbarContainer";
import ProfileModal from "./components/topbar-premium/profile/ProfileModal";
import SettingsModalProvider from "./components/topbar-premium/profile/settings/modal/SettingsModalProvider";
import { ScopeProvider } from "./components/topbar-premium/context/ScopeContext";
import useProfileModal from "./components/topbar-premium/profile/useProfileModal";
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const hideSidebar =
    pathname.startsWith("/dashboard/auth") ||
    pathname.startsWith("/dashboard/print") ||
    pathname.startsWith("/dashboard/fullscreen");

  /* ======================================================
   * AUTHORIZATION GATE (TANPA REDIRECT)
   * ====================================================== */
  useEffect(() => {
    let active = true;

    const runGate = async () => {
      const res = await fetch("/api/me", { credentials: "include" });
      if (!res.ok) return;
      type MeProfile = { email_allowed?: boolean; profile_completed?: boolean };
      let json: { profile?: MeProfile } = {};
      try {
        const text = await res.text();
        if (text.trim()) json = JSON.parse(text) as { profile?: MeProfile };
      } catch {
        return;
      }
      const profile = json?.profile ?? null;

      if (!active) return;

      if (!profile) {
        return;
      }

      if (!profile.email_allowed) {
        return;
      }

      if (!profile.profile_completed) {
        useProfileModal.getState().openForced();
      }
    };

    runGate();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      {!hideSidebar && <Sidebar />}

      <ScopeProvider>
        <div className="flex flex-col flex-1 min-w-0">
          <TopbarContainer />
          <ProfileModal />
          <SettingsModalProvider />
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </ScopeProvider>
    </div>
  );
}
