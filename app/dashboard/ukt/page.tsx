"use client";

import dynamic from "next/dynamic";

const AuditUjianModule = dynamic(
  () => import("../modules/audit-ujian/AuditUjianModule"),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[40vh] items-center justify-center text-zinc-500">
        Memuat UKT…
      </div>
    ),
  }
);

export default function UKTPage() {
  return <AuditUjianModule />;
}
