"use client";

import { useEffect, useMemo, useState } from "react";
import {
  motion,
  useMotionValue,
  animate,
  useMotionValueEvent,
} from "framer-motion";
import type { ProfileData } from "../hooks/useProfileData";

const REQUIRED_FIELDS: (keyof ProfileData)[] = [
  "nik",
  "nama",
  "email",
  "telepon",
  "jenisKelamin",
  "tanggalLahir",
  "namaAyah",
  "namaIbu",
  "pekerjaanOrtu",
  "alamat",
  "provinceId",
  "regencyId",
  "districtId",
  "villageId",
  "rantingId",
];

export default function CompletionScore({
  profile,
}: {
  profile: ProfileData | null | undefined;
}) {
  const totalFields = REQUIRED_FIELDS.length;

  const filledCount = useMemo(() => {
    if (!profile) return 0;

    return REQUIRED_FIELDS.filter((key) => {
      const value = profile[key];
      return (
        value !== null && value !== undefined && String(value).trim() !== ""
      );
    }).length;
  }, [profile]);

  const score = useMemo(() => {
    return Math.round((filledCount / totalFields) * 100);
  }, [filledCount, totalFields]);

  // ===== Motion counter
  const animatedScore = useMotionValue(0);
  const [displayNumber, setDisplayNumber] = useState(0);

  useMotionValueEvent(animatedScore, "change", (latest) => {
    setDisplayNumber(Math.round(latest));
  });

  useEffect(() => {
    animate(animatedScore, score, {
      duration: 0.8,
      ease: "easeOut",
    });
  }, [score, animatedScore]);

  // ===== color logic
  const barColor = useMemo(() => {
    if (score < 40) return "from-red-500 to-red-300";
    if (score < 70) return "from-yellow-500 to-yellow-300";
    if (score < 90) return "from-green-500 to-green-300";
    return "from-cyan-400 to-cyan-200";
  }, [score]);

  return (
    <div className="w-full select-none">
      <div className="flex justify-between text-xs text-cyan-300/80 mb-1 font-medium">
        <span>Kelengkapan Profil</span>
        <span className="text-cyan-200 font-semibold">{displayNumber}%</span>
      </div>

      <div className="relative w-full h-4 rounded-md overflow-hidden bg-[#0a1a22]/60 border border-cyan-700/40">
        <motion.div
          className={`h-full bg-gradient-to-r ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
