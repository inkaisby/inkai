"use client";

import { useState } from "react";
import MenuList from "./menu/MenuList";
import FeatureConfigPanel from "./FeatureConfigPanel";
import DbViewerPanel from "./DbViewerPanel";

type Tab = "menu" | "fitur" | "db";

export default function MasterDataPanel() {
  const [tab, setTab] = useState<Tab>("menu");

  return (
    <section className="section-card">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Master Data</h2>
          <p className="text-xs text-white/50 mt-1">
            Pengaturan data inti yang dipakai operasional (CRUD).
          </p>
        </div>

        <div className="flex gap-2">
          <TabButton active={tab === "menu"} onClick={() => setTab("menu")}>
            Menu Sidebar
          </TabButton>
          <TabButton active={tab === "fitur"} onClick={() => setTab("fitur")}>
            Konfigurasi Fitur
          </TabButton>
          <TabButton active={tab === "db"} onClick={() => setTab("db")}>
            DB Viewer
          </TabButton>
        </div>
      </div>

      <div className="p-4">
        {tab === "menu" && <MenuList />}
        {tab === "fitur" && <FeatureConfigPanel />}
        {tab === "db" && <DbViewerPanel />}
      </div>
    </section>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
        active
          ? "bg-emerald-500/15 border-emerald-500/40 text-white"
          : "border-white/10 text-white/60 hover:text-white hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}

