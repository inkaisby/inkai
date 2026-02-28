"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import SakuraEffect from "../effects/SakuraEffect"; // ✔ gunakan komponen yang benar

export default function CinematicIntro({ onFinish }) {
  // SAFE CLIENT RANDOM FOR TATAMI DUST
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const arr = Array.from({ length: 25 }).map(() => ({
      left: Math.random() * 100,
      bottom: Math.random() * 40,
      duration: 6 + Math.random() * 4,
      delay: Math.random() * 1.6,
    }));
    setParticles(arr);
  }, []);

  return (
    <motion.div
      className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5 }}
      onAnimationComplete={onFinish}
    >
      {/* 🌸 SAKURA EFFECT (PASTI BERFUNGSI) */}
      <SakuraEffect count={50} />

      {/* SHOJI LIGHT */}
      <motion.div
        initial={{ opacity: 0, x: -200 }}
        animate={{ opacity: 0.35, x: 0 }}
        transition={{ duration: 3, ease: "easeInOut" }}
        className="absolute inset-0 bg-[radial-gradient(circle_at_left,rgba(255,240,200,0.25),transparent_70%)]"
      />

      {/* TATAMI DUST */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map((p, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: [0, 0.6, 0], y: [-30, -60, -80] }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: p.delay,
            }}
            className="absolute w-[3px] h-[3px] bg-yellow-200/40 blur-[2px]"
            style={{
              left: `${p.left}%`,
              bottom: `${p.bottom}%`,
            }}
          />
        ))}
      </div>

      {/* DOJO LANTERN */}
      <motion.img
        src="/logo/dojo-light.png"
        alt="Dojo Light"
        initial={{ opacity: 0, scale: 1.3 }}
        animate={{ opacity: 0.15, scale: 1 }}
        transition={{ duration: 3.2, ease: "easeOut" }}
        className="absolute top-0 w-[480px] opacity-10 pointer-events-none"
      />

      {/* SPIRIT ENERGY */}
      <motion.div
        animate={{ scale: [1, 1.22, 1], opacity: [0.35, 0.75, 0.35] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute w-[420px] h-[420px] rounded-full bg-red-500/25 blur-3xl"
      />

      {/* RINGS */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
        className="absolute w-[520px] h-[520px] rounded-full border-[4px] border-yellow-300/30 blur-xl"
      />

      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className="absolute w-[290px] h-[290px] rounded-full border-[3px] border-red-400/40 blur-md"
      />

      {/* SILHOUETTE */}
      <motion.img
        src="/logo/karate-silhouette.png"
        alt="Silhouette"
        initial={{ opacity: 0, scale: 1.25 }}
        animate={{ opacity: 0.22, scale: 1 }}
        transition={{ duration: 2.4, ease: "easeOut" }}
        className="absolute bottom-0 w-[540px] pointer-events-none"
      />

      {/* CALLIGRAPHY */}
      <motion.img
        src="/logo/kanji-calligraphy.png"
        alt="Kanji"
        initial={{ opacity: 0, y: 45, rotate: -8 }}
        animate={{ opacity: 0.2, y: 0, rotate: 0 }}
        transition={{ duration: 3, ease: "easeOut", delay: 1 }}
        className="absolute inset-0 w-[620px] mx-auto opacity-10 pointer-events-none"
      />

      {/* LOGO */}
      <motion.img
        src="/logo/inkai-logo.png"
        alt="INKAI Logo"
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2.2, ease: "easeOut", delay: 0.8 }}
        className="relative z-20 w-44 mb-6 drop-shadow-[0_0_28px_rgba(255,255,255,0.6)]"
        draggable={false}
      />

      {/* TITLE */}
      <motion.h1
        initial={{ opacity: 0, y: 35 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 2.2, ease: "easeOut", delay: 1.4 }}
        className="relative z-20 text-white text-5xl font-extrabold tracking-[0.25em]"
      >
        INKAI-APP
      </motion.h1>

      {/* SUBTITLE */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.9 }}
        transition={{ duration: 2.8, delay: 1.8 }}
        className="relative z-20 text-gray-300 text-base tracking-[0.3em] mt-4"
      >
        日本空手道 • Dojo Awakening
      </motion.p>
    </motion.div>
  );
}
