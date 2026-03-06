"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { supabaseBrowser as supabase } from "@/app/lib/supabaseBrowser";

import EmailList, { UserRow } from "./EmailList";
import ProfilePanel from "./ProfilePanel";
import ChangePasswordPanel from "./ChangePasswordPanel";
import PermissionMatrix from "./PermissionMatrix";
import MenuList from "./menu/MenuList";
import UserActivityLogPanel from "./logs/UserActivityLogPanel";
import UserResumePanel from "./UserResumePanel";
import { ModeButton } from "./ModeButton";
import RoleManagementPanel from "./roles/RoleManagementPanel";

// ⬇️ DATABASE MODE
import DatabaseView from "./database/DatabaseView";

type Mode = "users" | "menu" | "database";
type Tab = "resume" | "profile" | "password" | "roles" | "logs";

const STORAGE_KEY = "settings:leftPanelWidth";
const SNAP_POINTS = [360, 420, 560, 720];
const ROOT_EMAIL =
  (process.env.NEXT_PUBLIC_INKAI_ROOT_EMAIL as string | undefined)?.toLowerCase() ??
  null;

type SettingsViewProps = {
  loading: boolean;
  isSuperAdmin: boolean;
  sessionEmail: string | null;
  selectedEmail: string | null;
  onSelectEmail: (email: string | null) => void;
  permissions: Record<string, unknown>;
  setPermissions: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  onSavePermission: () => Promise<void>;
  saving: boolean;
};

export default function SettingsView({
  loading,
  isSuperAdmin,
  sessionEmail,
  selectedEmail,
  onSelectEmail,
  permissions,
  setPermissions,
  onSavePermission,
  saving,
}: SettingsViewProps) {
  const [mode, setMode] = useState<Mode>("users");
  /** Trigger refresh semua tab saat ada perubahan Realtime (profiles, roles) */
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // USERS MODE STATE
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [permissionOpen, setPermissionOpen] = useState(false);

  // Sinkronkan email terpilih ke parent agar Simpan Akses (permission) pakai user yang benar
  useEffect(() => {
    onSelectEmail?.(selectedUser?.email ?? null);
  }, [selectedUser?.email, onSelectEmail]);

  // LAYOUT
  const [leftWidth, setLeftWidth] = useState(420);
  const dragging = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset tabs when selected user changes
    setActiveTab("resume");
    setPermissionOpen(false);
  }, [selectedUser?.user_id]);

  /* ================= LOAD WIDTH ================= */
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate width from localStorage once
      setLeftWidth(Number(saved));
    }
  }, []);

  /* ================= REALTIME: profiles, user_structural_roles, user_functional_roles ================= */
  useEffect(() => {
    if (mode !== "users" || !selectedUser?.user_id) return;

    const uid = selectedUser.user_id;
    const channel = supabase
      .channel(`settings_realtime:${uid}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `user_id=eq.${uid}`,
        },
        () => setRefreshTrigger((p) => p + 1)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_structural_roles",
          filter: `user_id=eq.${uid}`,
        },
        () => setRefreshTrigger((p) => p + 1)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_functional_roles",
          filter: `user_id=eq.${uid}`,
        },
        () => setRefreshTrigger((p) => p + 1)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mode, selectedUser?.user_id]);

  /* ================= RESIZE HELPERS ================= */
  const clamp = (v: number) => Math.min(720, Math.max(320, v));

  const snap = (v: number) =>
    SNAP_POINTS.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));

  const updateWidth = useCallback((x: number, snapIt = false) => {
    const val = clamp(x);
    const finalVal = snapIt ? snap(val) : val;
    setLeftWidth(finalVal);
    localStorage.setItem(STORAGE_KEY, String(finalVal));
  }, []);

  /* ================= DRAG EVENTS ================= */
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      updateWidth(e.clientX);
    };

    const onUp = (e: MouseEvent) => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.classList.remove("select-none");
      updateWidth(e.clientX, true);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [updateWidth]);

  if (loading) return <div className="p-6">Memuat…</div>;
  if (!isSuperAdmin) return <div className="p-6">Tidak punya akses</div>;

  return (
    <div className="p-6 space-y-4">
      {/* ================= HEADER ================= */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Settings</h1>
          <div className="text-sm text-emerald-400">
            Super Admin — full akses aktif
          </div>
        </div>

        <div className="flex gap-3">
          <ModeButton
            active={mode === "users"}
            variant="users"
            title="Users"
            subtitle="Akun & Profil"
            onClick={() => setMode("users")}
          />
          <ModeButton
            active={mode === "menu"}
            variant="menu"
            title="Menu"
            subtitle="Navigasi & Akses"
            onClick={() => setMode("menu")}
          />
          <ModeButton
            active={mode === "database"}
            variant="database"
            title="Database"
            subtitle="Audit & Struktur"
            onClick={() => setMode("database")}
          />
        </div>
      </header>

      {/* ================= USERS MODE ================= */}
      {mode === "users" && (
        <div className="flex h-[640px] border border-white/10 rounded-lg overflow-hidden">
          {/* LEFT PANEL */}
          <aside
            style={{ width: leftWidth }}
            className="flex flex-col border-r border-white/10"
          >
            <div className="section-header">Daftar Pengguna</div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              <EmailList
                sessionEmail={sessionEmail}
                selectedUser={selectedUser}
                onSelectUser={setSelectedUser}
                refreshTrigger={refreshTrigger}
              />
            </div>

            <div className="border-t border-white/10">
              <button
                onClick={() => setPermissionOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-white/5"
              >
                <span>
                  Akses Menu
                  <span className="block text-xs text-white/40 font-normal">
                    Akses per menu (baca, tambah, ubah, hapus)
                  </span>
                  {selectedUser && (
                    <span className="text-white/40 text-xs mt-0.5 block">
                      — {selectedUser.email}
                    </span>
                  )}
                </span>
                <span
                  className={`transition-transform ${
                    permissionOpen ? "rotate-180" : ""
                  }`}
                >
                  ▼
                </span>
              </button>

              {permissionOpen && selectedUser && (
                <div className="p-3 h-[360px]">
                  <PermissionMatrix
                    email={selectedUser.email}
                    sessionEmail={sessionEmail}
                    permissions={permissions}
                    setPermissions={setPermissions}
                    onSave={onSavePermission}
                    saving={saving}
                  />
                </div>
              )}
            </div>
          </aside>

          {/* RESIZER */}
          <div
            onMouseDown={() => {
              dragging.current = true;
              document.body.classList.add("select-none");
            }}
            className="w-1 cursor-col-resize bg-white/10 hover:bg-white/30"
          />

          {/* RIGHT PANEL */}
          <main className="flex-1 flex flex-col p-4 min-h-0">
            {!selectedUser ? (
              <div className="empty-state">
                Pilih pengguna untuk melihat detail
              </div>
            ) : (
              <>
                <div className="tab-header">
                  <TabButton
                    active={activeTab === "resume"}
                    onClick={() => setActiveTab("resume")}
                  >
                    Resume
                  </TabButton>
                  <TabButton
                    active={activeTab === "profile"}
                    onClick={() => setActiveTab("profile")}
                  >
                    Profil
                  </TabButton>
                  <TabButton
                    active={activeTab === "password"}
                    onClick={() => setActiveTab("password")}
                  >
                    Ubah Password
                  </TabButton>
                  <TabButton
                    active={activeTab === "roles"}
                    onClick={() => setActiveTab("roles")}
                  >
                    Role Management
                  </TabButton>
                  <TabButton
                    active={activeTab === "logs"}
                    onClick={() => setActiveTab("logs")}
                  >
                    Log Aktivitas
                  </TabButton>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto pt-4 pr-2">
                  {activeTab === "resume" && (
                    <UserResumePanel user={selectedUser} />
                  )}
                  {activeTab === "profile" && (
                    <ProfilePanel user={selectedUser} isSuperAdmin={isSuperAdmin} />
                  )}
                  {activeTab === "password" && (
                    <ChangePasswordPanel
                      email={selectedUser.email}
                      userId={selectedUser.id}
                    />
                  )}
                  {activeTab === "roles" && (
                    <div className="space-y-4">
                      <div className="text-sm text-white/40">
                        Role untuk: {selectedUser.email}
                      </div>

                      {ROOT_EMAIL &&
                      selectedUser.email &&
                      selectedUser.email.toLowerCase() === ROOT_EMAIL ? (
                        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm">
                          ROOT account — Role tidak dapat diubah.
                        </div>
                      ) : (
                        <RoleManagementPanel
                          userId={selectedUser.user_id}
                          userEmail={selectedUser.email}
                          userRegencyId={
                            selectedUser.regency_id != null
                              ? String(selectedUser.regency_id).replace(/\./g, "").trim()
                              : null
                          }
                          refreshTrigger={refreshTrigger}
                        />
                      )}
                    </div>
                  )}

                  {activeTab === "logs" && (
                    <UserActivityLogPanel email={selectedUser.email} />
                  )}
                </div>
              </>
            )}
          </main>
        </div>
      )}

      {/* ================= MENU MODE ================= */}
      {mode === "menu" && (
        <section className="section-card">
          <MenuList />
        </section>
      )}

      {/* ================= DATABASE MODE ================= */}
      {mode === "database" && (
        <section className="section-card h-[640px]">
          <DatabaseView />
        </section>
      )}
    </div>
  );
}

/* ================= TAB BUTTON ================= */
function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 text-sm border-b-2 ${
        active
          ? "border-emerald-500 text-white"
          : "border-transparent text-white/50 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
