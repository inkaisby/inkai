"use client";

import { useMemo } from "react";
import type { ProfileData } from "./useProfileData";

/** Field wajib sama dengan ProfileSchema / step 1+2+3 (+ avatar agar konsisten dengan Settings). */
const REQUIRED_FIELDS: (keyof ProfileData)[] = [
  "nik",
  "nama",
  "email",
  "telepon",
  "jenisKelamin",
  "tanggalLahir",
  "alamat",
  "provinceId",
  "regencyId",
  "districtId",
  "villageId",
  "rantingId",
  "avatarPath",
];

function isFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  return String(value).trim() !== "";
}

/**
 * Skor kelengkapan profil (0–100%). 100% hanya bila semua field wajib terisi.
 * Sumber kebenaran tunggal agar score di modal konsisten dengan validasi simpan.
 */
export default function useCompletionScore(
  profile: ProfileData | null | undefined,
) {
  return useMemo(() => {
    if (!profile) {
      return { score: 0, filledCount: 0, totalFields: REQUIRED_FIELDS.length };
    }

    const filledCount = REQUIRED_FIELDS.filter((key) => {
      if (key === "avatarPath") {
        return isFilled(profile.avatarPath) || isFilled(profile.avatarUrl) || isFilled(profile.avatarFile);
      }
      return isFilled(profile[key]);
    }).length;
    const totalFields = REQUIRED_FIELDS.length;
    const score = Math.round((filledCount / totalFields) * 100);

    return { score, filledCount, totalFields };
  }, [profile]);
}
