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
    <motion.div
      role="button"
      tabIndex={0}
      whileTap={{ scale: 0.9 }}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className="
        relative cursor-pointer p-2 rounded-md
        bg-white/5 hover:bg-white/10
        border border-cyan-500/30
      "
    >
      <Bell size={20} className="text-cyan-300" />

      {hasNew && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="
            absolute -top-0.5 -right-0.5
            h-3 w-3 rounded-full bg-red-500
            shadow-[0_0_8px_rgba(255,0,0,0.8)]
          "
        />
      )}

      {count > 0 && (
        <span className="absolute -bottom-1 right-0 text-[10px] text-cyan-300 opacity-80">
          {count}
        </span>
      )}
    </motion.div>
  );
}
