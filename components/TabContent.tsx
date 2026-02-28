"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import DevelopingModule from "../components/system/DevelopingModule";

interface Props {
  children?: React.ReactNode;
}

export default function TabContent({ children }: Props) {
  const pathname = usePathname();
  const [currentPath, setCurrentPath] = useState(pathname);
  const [isLoading, setIsLoading] = useState(false);

  // === Detect route change (klik Sidebar) ===
  useEffect(() => {
    if (pathname !== currentPath) {
      setIsLoading(true);

      // Simulasi modul sedang di-boot oleh sistem (tone JARVIS)
      const timer = setTimeout(() => {
        setIsLoading(false);
        setCurrentPath(pathname);
      }, 250); // durasi transisi ringan

      return () => clearTimeout(timer);
    }
  }, [pathname, currentPath]);

  // === Fallback: modul belum dibuat ===
  const isModuleMissing =
    currentPath?.startsWith("/dashboard") &&
    !currentPath.startsWith("/dashboard/developing") &&
    !children;

  const contentToRender = isModuleMissing ? <DevelopingModule /> : children;

  return (
    <div className="relative w-full h-full">
      {/* === Loading shimmer hologram === */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-center justify-center
                 bg-black/40 backdrop-blur-md rounded-xl"
          >
            {/* Ring */}
            <div className="absolute w-28 h-28 rounded-full border border-cyan-500/40 animate-ping" />
            <div className="absolute w-24 h-24 rounded-full border border-cyan-400/60 animate-spin-slow" />

            {/* Logo */}
            <motion.img
              src="/logo/inkai-logo.png"
              alt="INKAI"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="w-14 h-14 object-contain drop-shadow-[0_0_12px_rgba(34,211,238,0.6)]"
            />

            {/* Text */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="absolute mt-24 text-cyan-300 text-sm tracking-widest"
            >
              BOOTING MODULE
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === JARVIS Module Transition === */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPath}
          initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative z-10"
        >
          {contentToRender}
        </motion.div>
      </AnimatePresence>

      {/* === Optional grid hologram background === */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] bg-[url('/grid.svg')] bg-cover z-0" />
    </div>
  );
}
