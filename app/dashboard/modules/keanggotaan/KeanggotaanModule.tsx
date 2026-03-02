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
const VALID_TABS: TabKey[] = ["kyu", "dan", "pelatihan", "pindah"];

export default function KeanggotaanModule() {
  const { data, loading, kyu, dan, pelatihan } = useMyKeanggotaan();
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
     RENDER (key agar UI update saat data dari DB ready)
  =============================== */
  return (
    <div className="pb-12 flex justify-center" key={data?.id ?? "loading"}>
      <div className="w-full max-w-5xl">
        <div className="mt-6">
          <div className="relative z-10 px-6 -mt-2">
            <DigitalCardPreview anggota={anggota} />
          </div>

          <div className="mt-6">
            <TabNavigation tab={tab} onChange={handleTabChange} />
          </div>

          <div className="mt-4">
            {tab === "kyu" && (
              <TabKyu
                key={`kyu-${data?.id ?? ""}-${(kyu ?? []).length}-${kyu?.[0]?.id ?? ""}`}
                initialData={kyu ?? []}
                anggota={anggota}
              />
            )}
            {tab === "dan" && (
              <TabDan
                key={`dan-${data?.id ?? ""}-${(dan ?? []).length}-${dan?.[0]?.dan ?? ""}`}
                initialData={dan ?? []}
                anggota={anggota}
              />
            )}
            {tab === "pelatihan" && (
              <TabPelatihan
                key={`pelatihan-${data?.id ?? ""}-${(pelatihan ?? []).length}-${pelatihan?.[0]?.id ?? ""}`}
                initialData={pelatihan ?? []}
              />
            )}
            {tab === "pindah" && <TabPindahRanting anggota={anggota} />}
          </div>
        </div>
      </div>
    </div>
  );
}
