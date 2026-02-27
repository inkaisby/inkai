"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { TriangleAlert } from "lucide-react";

export default function ErrorPage() {
  const router = useRouter();
  const [msg, setMsg] = useState("Unknown error");

  // Ambil error dari cookie
  useEffect(() => {
    const cookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("auth_error="));

    if (cookie) {
      const value = decodeURIComponent(cookie.split("=")[1]);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMsg(value);

      // Hapus cookie setelah dibaca (one-time)
      document.cookie = "auth_error=; path=/auth/error; max-age=0";
    }
  }, []);

  return (
    <main className="relative w-full min-h-screen flex items-center justify-center bg-black overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.08] pointer-events-none"
        style={{ backgroundImage: "url('/noise.png')" }}
      />

      <div className="absolute inset-0 bg-[linear-gradient(transparent_95%,rgba(0,255,255,0.05)_100%)] bg-[length:100%_3px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative z-10 bg-[#0b0b0b]/70 backdrop-blur-xl border border-cyan-400/50 
                   rounded-2xl p-10 max-w-xl w-[90%] 
                   shadow-[0_0_25px_rgba(0,255,255,0.25)]"
      >
        <motion.div
          animate={{ x: [0, -2, 2, -1, 1, 0], opacity: [1, 0.8, 1] }}
          transition={{
            duration: 0.2,
            repeat: Infinity,
            repeatType: "reverse",
          }}
          className="flex justify-center mb-6"
        >
          <TriangleAlert className="w-20 h-20 text-cyan-300 drop-shadow-[0_0_20px_rgba(0,255,255,0.8)]" />
        </motion.div>

        <div className="relative text-center mb-4">
          <motion.h1
            animate={{
              x: [0, -2, 2, -1, 1, 0],
              textShadow: [
                "0 0 8px rgba(0,255,255,0.8)",
                "2px 0 rgba(255,0,255,0.4)",
                "-2px 0 rgba(0,255,255,0.4)",
                "0 0 8px rgba(0,255,255,0.8)",
              ],
            }}
            transition={{
              duration: 0.18,
              repeat: Infinity,
              repeatType: "mirror",
            }}
            className="text-3xl font-bold text-cyan-300 tracking-wide"
          >
            SYSTEM ACCESS ERROR
          </motion.h1>
        </div>

        {/* === ERROR MESSAGE (dari cookie) === */}
        <p className="text-center text-red-400 text-sm mb-8 glitch-text">
          {msg}
        </p>

        <p className="text-center text-white/60 text-xs mb-10">
          inkai app mendeteksi adanya masalah dengan autentikasi Anda.
          <br />
          Silakan login ulang atau hubungi administrator.
        </p>

        <div className="flex justify-center gap-4">
          <button
            onClick={() => router.push("/")}
            className="px-5 py-2 rounded-lg bg-cyan-400 text-black font-semibold 
                       shadow-[0_0_15px_rgba(0,255,255,0.5)] hover:bg-cyan-300 transition-all"
          >
            Kembali
          </button>
        </div>
      </motion.div>

      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0, 0.15, 0], x: [-5, 5, -3, 3, 0] }}
        transition={{
          duration: 0.45,
          repeat: Infinity,
          repeatType: "mirror",
          ease: "easeInOut",
        }}
        style={{
          background:
            "linear-gradient(rgba(0,255,255,0.05), rgba(255,0,255,0.05))",
        }}
      />
    </main>
  );
}
