"use client";

import { TabKey } from "../../hooks/useKeanggotaanTabs";

const tabs: { key: TabKey; label: string }[] = [
  { key: "kyu", label: "KYU" },
  { key: "dan", label: "DAN" },
  { key: "pelatihan", label: "Pelatihan" },
  { key: "pindah", label: "Pindah Ranting" },
];

export default function TabNavigation({
  tab,
  onChange,
}: {
  tab: TabKey;
  onChange: (t: TabKey) => void;
}) {
  return (
    <div className="w-full flex gap-1 rounded-xl bg-slate-800/70 p-1 backdrop-blur">
      {tabs.map((t) => {
        const active = tab === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`
              relative flex-1 rounded-lg px-3 py-2
              text-xs font-semibold tracking-wide
              transition-all duration-200 ease-out
              ${
                active
                  ? "bg-gradient-to-r from-cyan-300 to-emerald-300 text-slate-900"
                  : "text-slate-400 bg-slate-900/40 hover:text-white"
              }
            `}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
