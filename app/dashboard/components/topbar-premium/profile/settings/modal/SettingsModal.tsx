"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import useSettingsModal from "../state/useSettingsModal";

import { ChangePasswordSection } from "../sections/security";
import ChangeEmailSection from "../sections/account/ChangeEmailSection";
import RevokeSessionsSection from "../sections/sessions/RevokeSessionsSection";

import { ToastContainer } from "../ui";

export default function SettingsModal() {
  const { close } = useSettingsModal();
  const [tab, setTab] = useState<"security" | "account" | "sessions">(
    "security"
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center p-4 sm:p-6 bg-black/60"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="
          relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-xl sm:rounded-xl p-4 sm:p-6
          bg-[#0e0e0e]/95 backdrop-blur border border-cyan-400/30
          shadow-[0_0_40px_-10px_rgba(0,255,255,0.6)]
        "
        style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        {/* ===========================
            TOAST (SCOPED TO MODAL)
        ============================ */}
        <ToastContainer />

        {/* ===========================
            HEADER
        ============================ */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-cyan-300 font-semibold">Pengaturan Akun</h2>
          <button
            type="button"
            onClick={close}
            className="text-white/60 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* ===========================
            TABS
        ============================ */}
        <div className="flex gap-4 mb-6 text-sm border-b border-cyan-500/20">
          {[
            ["security", "Keamanan"],
            ["account", "Akun"],
            ["sessions", "Sesi"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() =>
                setTab(key as "security" | "account" | "sessions")
              }
              className={`pb-2 ${
                tab === key
                  ? "text-cyan-300 border-b border-cyan-400"
                  : "text-white/50 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ===========================
            CONTENT
        ============================ */}
        {tab === "security" && <ChangePasswordSection />}
        {tab === "account" && <ChangeEmailSection />}
        {tab === "sessions" && <RevokeSessionsSection />}
      </motion.div>
    </motion.div>
  );
}
