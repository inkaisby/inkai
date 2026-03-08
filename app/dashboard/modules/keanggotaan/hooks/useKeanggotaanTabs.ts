"use client";
import { useState } from "react";

export type TabKey = "kyu" | "dan" | "pelatihan" | "prestasi" | "pindah";

export function useKeanggotaanTabs() {
  const [tab, setTab] = useState<TabKey>("kyu");
  return { tab, setTab };
}
