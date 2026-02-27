"use client";

import { useMemo } from "react";
import type { ProfileData } from "./useProfileData";

export default function useCompletionScore(
  profile: ProfileData | null | undefined,
) {
  return useMemo(() => {
    if (!profile) return 0;

    const fields: (keyof ProfileData)[] = [
      "nama",
      "email",
      "telepon",
      "jenisKelamin",
      "tanggalLahir",
      "alamat",
      "avatarUrl",
    ];

    const filled = fields.filter((f) => !!profile[f]);
    return Math.round((filled.length / fields.length) * 100);
  }, [profile]);
}
