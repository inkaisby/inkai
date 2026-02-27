"use client";

import { useMemo } from "react";

export default function useCompletionScore(
  profile: Record<string, unknown> | null | undefined,
) {
  return useMemo(() => {
    if (!profile) return 0;

    const fields = [
      "nama",
      "email",
      "telepon",
      "jenisKelamin",
      "tanggalLahir",
      "provinsi",
      "kabupaten",
      "alamat",
      "avatarUrl",
    ];

    const filled = fields.filter((f) => !!profile[f]);
    return Math.round((filled.length / fields.length) * 100);
  }, [profile]);
}
