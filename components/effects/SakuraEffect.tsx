"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function SakuraAnimeEffect({ count = 40 }) {
  const [petals, setPetals] = useState<
    {
      left: number;
      delay: number;
      duration: number;
      rotate: number;
      size: number;
      blur: number;
      drift: number;
      depth: number;
    }[]
  >([]);

  useEffect(() => {
    const p = Array.from({ length: count }).map(() => {
      const depth = Math.random(); // 0 = jauh, 1 = dekat

      return {
        left: Math.random() * 100,
        delay: Math.random() * 3,
        duration: 8 + Math.random() * 10,
        rotate: 20 + Math.random() * 120,
        size: 10 + depth * 22,
        blur: (1 - depth) * 3,
        drift: 15 + depth * 45,
        depth,
      };
    });

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPetals(p);
  }, [count]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {petals.map((p, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: -50 }}
          animate={{
            opacity: [0, 1, 1, 0],
            y: ["-10vh", "120vh"],
            x: [0, p.drift * 0.5, -(p.drift * 0.8), p.drift, 0],
            rotate: [0, p.rotate, -p.rotate * 0.6, p.rotate * 0.3, 0],
          }}
          transition={{
            duration: p.duration,
            ease: "easeInOut",
            delay: p.delay,
            repeat: Infinity,
          }}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 1.2,
            filter: `blur(${p.blur}px)`,
            zIndex: Math.floor(p.depth * 3),
          }}
        >
          <div
            className="w-full h-full bg-pink-300/90"
            style={{
              borderRadius: "60% 40% 70% 30% / 40% 60% 40% 60%",
              transform: "rotate(45deg)",
              boxShadow: "0 0 6px rgba(255,140,160,0.7)",
            }}
          />
        </motion.div>
      ))}
    </div>
  );
}
