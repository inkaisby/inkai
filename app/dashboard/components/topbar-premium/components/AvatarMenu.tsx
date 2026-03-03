"use client";

import { User } from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Session } from "@supabase/supabase-js";
import { supabaseBrowser as supabase } from "@/app/lib/supabaseBrowser";

import { useRouter } from "next/navigation";

import useProfileModal from "../profile/useProfileModal";
import useSettingsModal from "../profile/settings/state/useSettingsModal";
import { useBootstrapStore } from "../../../store/bootstrapStore";

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

export default function AvatarMenu() {
  const router = useRouter();
  const { data: bootstrap } = useBootstrapStore();

  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const { open: openProfileModal } = useProfileModal();
  const { open: openSettingsModal } = useSettingsModal();

  const displayName = useMemo(() => {
    const nama = bootstrap?.user?.nama;
    if (nama && String(nama).trim() !== "") return String(nama).trim();
    return bootstrap?.user?.email ?? null;
  }, [bootstrap?.user?.nama, bootstrap?.user?.email]);

  const roleLabel = useMemo(() => {
    const u = bootstrap?.user;
    if (!u) return null;
    const appRole = u.app_role;
    if ((appRole ?? "").toUpperCase() === "SUPERADMIN") return "Superadmin";
    const structural = (u.structural_roles ?? []) as Array<{
      role_name?: string;
      structural_level?: number;
      active?: boolean;
    }>;
    const activeStructural = structural.filter((r) => r.active !== false);
    const top = activeStructural.sort(
      (a, b) => (b.structural_level ?? 0) - (a.structural_level ?? 0)
    )[0];
    if (top?.role_name) return formatRole(top.role_name);
    if (appRole) return formatRole(appRole);
    return null;
  }, [bootstrap?.user?.app_role, bootstrap?.user?.structural_roles]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const avatarUrl =
    session?.user?.user_metadata?.avatar_url ||
    session?.user?.user_metadata?.picture ||
    session?.user?.user_metadata?.avatar ||
    null;

  /* ===============================
   * Outside click / ESC
   * =============================== */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    if (open) {
      document.addEventListener("click", handleClick);
      document.addEventListener("keydown", handleEsc);
    }

    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  /* ===============================
   * Logout Handler
   * =============================== */
  async function handleLogout() {
    const savedEmail = localStorage.getItem("inkai:last_email");
    const remember = localStorage.getItem("inkai:remember");

    await supabase.auth.signOut();

    if (remember === "1" && savedEmail) {
      localStorage.setItem("inkai:last_email", savedEmail);
      localStorage.setItem("inkai:remember", "1");
    }

    router.replace("/");
  }

  return (
    <div
      ref={containerRef}
      className={`relative ${
        open ? "shadow-[0_0_15px_rgba(0,255,255,0.4)]" : ""
      }`}
    >
      {/* ===============================
       * Avatar Button
       * =============================== */}
      <motion.div
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen((v) => !v)}
        className="
          h-9 w-9 rounded-full overflow-hidden
          flex items-center justify-center
          bg-white/10 hover:bg-white/20
          border border-cyan-500/40
          shadow-[0_0_10px_rgba(0,255,255,0.3)]
          cursor-pointer
        "
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- user avatar URL from auth metadata
          <img
            src={avatarUrl}
            alt="Avatar pengguna"
            className="h-full w-full object-cover"
          />
        ) : (
          <User size={18} className="text-cyan-200" />
        )}
      </motion.div>

      {/* ===============================
       * Dropdown Menu
       * =============================== */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.15 } }}
            className="
              absolute right-0 mt-2 w-44 rounded-md p-3
              bg-[#0e0e0e]/90 backdrop-blur-md
              border border-cyan-400/40
              shadow-[0_0_30px_-8px_rgba(0,255,255,0.5)]
              z-[99999]
            "
          >
            {/* User Name + Role */}
            <div className="pb-2 mb-2 border-b border-cyan-500/20 space-y-0.5">
              <div className="text-cyan-300 text-sm font-medium truncate">
                {displayName ?? session?.user?.email ?? "Pengguna"}
              </div>
              {roleLabel && (
                <div className="text-cyan-400/80 text-xs truncate">
                  {roleLabel}
                </div>
              )}
            </div>

            {/* Profil */}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                openProfileModal();
              }}
              className="w-full text-left text-white/80 hover:text-cyan-300 py-1 text-sm"
            >
              Profil
            </button>

            {/* Pengaturan */}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                openSettingsModal();
              }}
              className="w-full text-left text-white/80 hover:text-cyan-300 py-1 text-sm"
            >
              Pengaturan
            </button>

            {/* Logout */}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full text-left text-red-400 hover:text-red-300 py-1 text-sm"
            >
              Logout
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
