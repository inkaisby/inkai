"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/app/lib/supabaseBrowser";

export type RantingOption = {
  label: string;
  value: string;
};

type UseRantingOptionsParams = {
  provinceId?: string | null;
  regencyId?: string | null;
  districtId?: string | null;
};

/** Daftar ranting untuk dropdown (difilter by scope + wilayah: provinsi/kabupaten/kecamatan user). */
export default function useRantingOptions(params?: UseRantingOptionsParams) {
  const { provinceId, regencyId, districtId } = params ?? {};
  const [options, setOptions] = useState<RantingOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRanting = async () => {
      setLoading(true);
      try {
        const { data } = await supabaseBrowser.auth.getSession();
        if (!data?.session?.user) {
          setOptions([]);
          return;
        }

        const sp = new URLSearchParams();
        if (provinceId) sp.set("province_id", provinceId);
        if (regencyId) sp.set("regency_id", regencyId);
        if (districtId) sp.set("district_id", districtId);
        const qs = sp.toString();
        const url = qs ? `/api/ranting?${qs}` : "/api/ranting";

        const res = await fetch(url, { method: "GET", credentials: "include" });
        if (!res.ok) {
          const msg = await res.text().catch(() => "");
          console.warn("Gagal memuat ranting dari API:", res.status, msg);
          setOptions([]);
          return;
        }

        let list = (await res.json()) as Array<{ id: string; nama: string }>;
        const hasWilayahFilter = Boolean(provinceId || regencyId || districtId);
        if (hasWilayahFilter && (!list || list.length === 0)) {
          const fallback = await fetch("/api/ranting", { method: "GET", credentials: "include" });
          if (fallback.ok) {
            list = (await fallback.json()) as Array<{ id: string; nama: string }>;
          }
        }
        setOptions(
          (list ?? []).map((r) => ({
            label: r.nama,
            value: String(r.id),
          }))
        );
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRanting();
  }, [provinceId ?? "", regencyId ?? "", districtId ?? ""]);

  return { options, loading };
}