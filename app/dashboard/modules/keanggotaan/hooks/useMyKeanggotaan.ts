"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/app/lib/supabaseBrowser";
import { waitForSessionReady } from "@/app/lib/auth/sessionReady";
import { getPrefetch } from "@/app/dashboard/lib/prefetchCache";

import { User } from "@supabase/supabase-js";
import { Anggota } from "../types/Anggota";
import type { KyuItem } from "../types/Anggota";

/** Satu baris DAN dari DB */
export type DanRow = {
  dan: number;
  tanggal?: string;
  mshNumber?: string;
};

/** Satu baris pelatihan/sertifikasi dari DB */
export type PelatihanRow = {
  id: string;
  nama: string;
  tanggal: string;
  kategori: string;
};

export function useMyKeanggotaan() {
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<Anggota | null>(null);
  const [kyu, setKyu] = useState<KyuItem[]>([]);
  const [dan, setDan] = useState<DanRow[]>([]);
  const [pelatihan, setPelatihan] = useState<PelatihanRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      await waitForSessionReady();

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        setUser(null);
        setLoading(false);
        return;
      }

      setUser(user);

      // Pakai cache prefetch (dari hover menu) bila ada agar tampil cepat
      const cachedProfile = getPrefetch<Anggota>("keanggotaan-profile");
      const cachedRiwayat = getPrefetch<{ kyu?: KyuItem[]; dan?: DanRow[]; pelatihan?: PelatihanRow[] }>("keanggotaan-riwayat");
      if (cachedProfile) {
        setData(cachedProfile);
        if (cachedRiwayat) {
          setKyu(Array.isArray(cachedRiwayat.kyu) ? cachedRiwayat.kyu : []);
          setDan(Array.isArray(cachedRiwayat.dan) ? cachedRiwayat.dan : []);
          setPelatihan(Array.isArray(cachedRiwayat.pelatihan) ? cachedRiwayat.pelatihan : []);
        }
        setLoading(false);
      }

      const profileRes = await fetch("/api/keanggotaan/profile", { credentials: "include" });

      if (profileRes.ok) {
        const mapped = (await profileRes.json()) as Anggota;
        setData(mapped);

        try {
          const res = await fetch("/api/keanggotaan/riwayat", { credentials: "include" });
          if (res.ok) {
            const json = await res.json();
            setKyu(Array.isArray(json.kyu) ? json.kyu : []);
            setDan(Array.isArray(json.dan) ? json.dan : []);
            setPelatihan(Array.isArray(json.pelatihan) ? json.pelatihan : []);
          }
        } catch {
          // ignore
        }
      }

      setLoading(false);
    };

    load();
  }, []);

  return { user, data, loading, kyu, dan, pelatihan };
}
