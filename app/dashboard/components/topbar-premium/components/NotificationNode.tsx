"use client";

import { Bell } from "lucide-react";
import { motion } from "framer-motion";
import { useNotification } from "../context/NotificationContext";

type Props = { onClick?: () => void };

export default function NotificationNode({ onClick }: Props) {
  const { count, hasNew, openNotifications } = useNotification();

  const handleClick = () => {
    onClick?.();
    openNotifications();
  };

  return (
    <motion.button
      type="button"
      suppressHydrationWarning
      role="button"
      tabIndex={0}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      title="Notifikasi & aktivitas"
      className="
        relative shrink-0 cursor-pointer p-2.5 rounded-xl
        bg-gradient-to-br from-white/[0.06] to-white/[0.02]
        hover:from-cyan-500/15 hover:to-cyan-500/5
        border border-white/10 hover:border-cyan-500/40
        shadow-[0_2px_12px_rgba(0,0,0,0.3)]
        transition-colors duration-200
      "
      aria-label={count > 0 ? `${count} notifikasi belum dibaca` : "Notifikasi — klik untuk melihat aktivitas"}
    >
      {/* Lonceng dengan efek swing saat ada notifikasi baru */}
      <motion.span
        className="relative block text-cyan-300"
        animate={
          hasNew
            ? {
                rotate: [0, -12, 12, -8, 8, -4, 4, 0],
                transition: {
                  duration: 1.2,
                  repeat: Infinity,
                  repeatDelay: 2,
                },
              }
            : {}
        }
        style={{ transformOrigin: "50% 0%" }}
      >
        <Bell size={22} strokeWidth={1.8} />
      </motion.span>

      {/* Glow ring saat ada notifikasi baru */}
      {hasNew && (
        <motion.span
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
          }}
          className="
            absolute inset-0 rounded-xl
            ring-2 ring-cyan-400/50
            pointer-events-none
          "
          style={{
            boxShadow: "0 0 20px rgba(34, 211, 238, 0.4)",
          }}
        />
      )}

      {/* Badge jumlah */}
      {count > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="
            absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1
            flex items-center justify-center
            text-[10px] font-semibold text-white
            bg-cyan-500 rounded-full
            shadow-[0_0_10px_rgba(34,211,238,0.6)]
            border border-cyan-400/50
          "
        >
          {count > 99 ? "99+" : count}
        </motion.span>
      )}

      {/* Titik merah untuk notifikasi belum dibaca (tanpa count) */}
      {hasNew && count === 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="
            absolute top-1 right-1
            h-2 w-2 rounded-full bg-red-500
            shadow-[0_0_8px_rgba(239,68,68,0.8)]
          "
        />
      )}
    </motion.button>
  );
}
