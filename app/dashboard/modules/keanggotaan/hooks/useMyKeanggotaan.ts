"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/app/lib/supabaseBrowser";
import { waitForSessionReady } from "@/app/lib/auth/sessionReady";

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
        console.log("[useMyKeanggotaan] Auth gagal atau tidak login:", error?.message ?? "no user");
        setUser(null);
        setLoading(false);
        return;
      }

      setUser(user);

      // Profil dari API (admin client) agar avatar_path/avatarUrl selalu terbaca
      const profileRes = await fetch("/api/keanggotaan/profile", {
        credentials: "include",
      });

      if (profileRes.ok) {
        const mapped = (await profileRes.json()) as Anggota;
        setData(mapped);

        /* Pamungkas: ambil riwayat KYU, DAN, Pelatihan lewat API server (service role) agar tidak kena permission denied */
        try {
          const res = await fetch("/api/keanggotaan/riwayat", { credentials: "include" });
          if (res.ok) {
            const json = await res.json();
            const kyuList: KyuItem[] = Array.isArray(json.kyu) ? json.kyu : [];
            const danList: DanRow[] = Array.isArray(json.dan) ? json.dan : [];
            const pelatihanList: PelatihanRow[] = Array.isArray(json.pelatihan) ? json.pelatihan : [];
            setKyu(kyuList);
            setDan(danList);
            setPelatihan(pelatihanList);
          } else {
            console.warn("[useMyKeanggotaan] API riwayat:", res.status, await res.text());
          }
        } catch (e) {
          console.warn("[useMyKeanggotaan] API riwayat error:", e);
        }
      } else {
        const errText = await profileRes.text().catch(() => "");
        console.warn("[useMyKeanggotaan] Profile API:", profileRes.status, errText);
      }

      setLoading(false);
    };

    load();
  }, []);

  return { user, data, loading, kyu, dan, pelatihan };
}
