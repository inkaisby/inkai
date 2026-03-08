"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import { Anggota, KyuItem } from "./types";

import { useMyKeanggotaan } from "./hooks/useMyKeanggotaan";
import { useKeanggotaanTabs, TabKey } from "./hooks/useKeanggotaanTabs";

import TabNavigation from "./components/Tabs/TabNavigation";
import TabKyu from "./components/Tabs/TabKyu";
import TabDan from "./components/Tabs/TabDan";
import TabPelatihan from "./components/Tabs/TabPelatihan";
import TabPrestasi from "./components/Tabs/TabPrestasi";
import TabPindahRanting from "./components/Tabs/TabPindahRanting";
import DigitalCardPreview from "./components/DigitalCardPreview";

/* ===============================
type KyuItem = {
  id: string;
  level: number;
  warna?: string;
  noIjazah?: string;
  tanggalIjazah?: string;
};
   TYPES (LOCAL EXTENSION)
================================ */
type AnggotaKeanggotaan = Anggota & {
  kyu: KyuItem[];
  sertifikasi: unknown[];
};

/* ===============================
   CONSTANTS
================================ */
const VALID_TABS: TabKey[] = ["kyu", "dan", "pelatihan", "prestasi", "pindah"];

export default function KeanggotaanModule() {
  const { data, loading, kyu, dan, pelatihan, prestasi, refetchRiwayat } = useMyKeanggotaan();
  const { tab, setTab } = useKeanggotaanTabs();

  const searchParams = useSearchParams();
  const router = useRouter();

  const urlTab = (searchParams.get("tab") as TabKey) ?? "kyu";

  /* ===============================
     SYNC URL → STATE
  =============================== */
  useEffect(() => {
    if (VALID_TABS.includes(urlTab) && tab !== urlTab) {
      setTab(urlTab);
    }
  }, [urlTab, tab, setTab]);

  /* ===============================
     SYNC STATE → URL
  =============================== */
  const handleTabChange = (nextTab: TabKey) => {
    if (nextTab === tab) return;
    setTab(nextTab);
    router.replace(`?tab=${nextTab}`, { scroll: false });
  };

  /* ===============================
     LOADING
  =============================== */
  if (loading) {
    return <div className="px-6 py-8 text-slate-400">Memuat keanggotaan…</div>;
  }

  /* ===============================
     FALLBACK DATA
     - id/user_id "session-only" hanya untuk tampilan; jangan dipakai untuk request API.
     - kyu/sertifikasi dari backend nanti bisa ditambahkan di useMyKeanggotaan.
  =============================== */
  const anggota: AnggotaKeanggotaan = {
    id: data?.id ?? "session-only",
    user_id: data?.user_id ?? "session-only",
    nama: data?.nama ?? "Pengguna",
    nomor: data?.nomor,

    // EXTENSION (dari useMyKeanggotaan: kyu, dan, pelatihan dari DB)
    status: data?.status,
    dan: data?.dan ?? null,
    ranting: data?.ranting ?? { id: "-", nama: "-" },
    avatarUrl: data?.avatarUrl ?? null,
    kyu: kyu ?? [],
    sertifikasi: pelatihan ?? [],
  };

  /* ===============================
     RENDER
     - Tanpa key di root agar tidak remount seluruh modul saat data load (lebih soft).
     - Semua tab di-render, hanya yang aktif tampil (hidden untuk yang lain) agar:
       state form/riwayat tidak hilang dan Pindah Ranting tidak refetch tiap ganti tab.
  =============================== */
  return (
    <div className="pb-12 flex justify-center">
      <div className="w-full max-w-5xl">
        <div className="mt-6">
          <div className="relative z-10 px-6 -mt-2">
            <DigitalCardPreview anggota={anggota} />
          </div>

          <div className="mt-6 print:hidden">
            <TabNavigation tab={tab} onChange={handleTabChange} />
          </div>

          <div className="mt-4 print:hidden">
            <div className={tab === "kyu" ? "" : "hidden"} role="tabpanel" aria-hidden={tab !== "kyu"}>
              <TabKyu
                key={`kyu-${data?.id ?? ""}`}
                initialData={kyu ?? []}
                anggota={anggota}
                onRefetch={refetchRiwayat}
              />
            </div>
            <div className={tab === "dan" ? "" : "hidden"} role="tabpanel" aria-hidden={tab !== "dan"}>
              <TabDan
                key={`dan-${data?.id ?? ""}`}
                initialData={dan ?? []}
                anggota={anggota}
                onRefetch={refetchRiwayat}
              />
            </div>
            <div className={tab === "pelatihan" ? "" : "hidden"} role="tabpanel" aria-hidden={tab !== "pelatihan"}>
              <TabPelatihan
                key={`pelatihan-${data?.id ?? ""}`}
                initialData={pelatihan ?? []}
                onRefetch={refetchRiwayat}
              />
            </div>
            <div className={tab === "prestasi" ? "" : "hidden"} role="tabpanel" aria-hidden={tab !== "prestasi"}>
              <TabPrestasi
                key={`prestasi-${data?.id ?? ""}`}
                initialData={prestasi ?? []}
                anggota={anggota}
                onRefetch={refetchRiwayat}
              />
            </div>
            <div className={tab === "pindah" ? "" : "hidden"} role="tabpanel" aria-hidden={tab !== "pindah"}>
              <TabPindahRanting anggota={anggota} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
