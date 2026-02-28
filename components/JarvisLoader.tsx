"use client";

import { motion } from "framer-motion";

type JarvisLoaderProps = {
  mode?: "inkai" | string;
  label?: string;
};

export default function JarvisLoader({
  mode = "inkai",
  label,
}: JarvisLoaderProps) {
  return (
    <div className="flex flex-col items-center text-center relative">
      {/* Ring luar */}
      <motion.div
        className="absolute w-44 h-44 rounded-full border border-cyan-400/30"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
      />

      {/* Ring dalam */}
      <motion.div
        className="absolute w-52 h-52 rounded-full border border-cyan-400/20"
        animate={{ rotate: -360 }}
        transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
      />

      {/* Logo */}
      <img
        src="/logo/inkai-logo.png"
        alt="INKAI Logo"
        className="w-40 h-40 relative z-10"
      />

      {/* Text default */}
      <p className="text-cyan-300 mt-6 tracking-widest text-sm">
        INSTITUT KARATE-DO INDONESIA
      </p>

      {/* Label opsional */}
      {label && <p className="text-cyan-400/80 mt-2 text-xs">{label}</p>}
    </div>
  );
}
