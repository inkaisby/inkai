"use client";

import { useState } from "react";
import DataTab from "./tabs/DataTab";
import ColumnsTab from "./tabs/ColumnsTab";
import RelationsTab from "./tabs/RelationsTab";
import ActivityTab from "./tabs/ActivityTab";

type Tab = "data" | "columns" | "relations" | "activity";

export default function DatabaseDetail({ table }: { table: string }) {
  const [tab, setTab] = useState<Tab>("data");

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* HEADER */}
      <div className="mb-3 shrink-0">
        <div className="text-lg font-semibold flex items-center gap-2">
          <span>Table: {table}</span>
          <span className="text-emerald-400 text-xs">● Realtime</span>
        </div>
        <div className="text-xs text-white/40">Read-only • Audit enabled</div>
      </div>

      {/* TABS */}
      <div className="flex gap-4 border-b border-white/10 mb-3 shrink-0">
        <TabButton active={tab === "data"} onClick={() => setTab("data")}>
          Data
        </TabButton>
        <TabButton active={tab === "columns"} onClick={() => setTab("columns")}>
          Columns
        </TabButton>
        <TabButton
          active={tab === "relations"}
          onClick={() => setTab("relations")}
        >
          Relations
        </TabButton>
        <TabButton
          active={tab === "activity"}
          onClick={() => setTab("activity")}
        >
          Log
        </TabButton>
      </div>

      {/* CONTENT */}
      <div className="flex-1 min-h-0 pr-2 overflow-hidden">
        {tab === "data" && (
          <div className="h-full min-h-0 overflow-hidden">
            <DataTab key={`${table}-data`} table={table} />
          </div>
        )}
        {tab === "columns" && (
          <div className="h-full min-h-0 overflow-hidden">
            <ColumnsTab key={`${table}-columns`} table={table} />
          </div>
        )}
        {tab === "relations" && (
          <div className="h-full min-h-0 overflow-hidden">
            <RelationsTab key={`${table}-relations`} table={table} />
          </div>
        )}
        {tab === "activity" && (
          <div className="h-full min-h-0 overflow-hidden">
            <ActivityTab key={`${table}-activity`} table={table} />
          </div>
        )}
      </div>
    </div>
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
      className={`pb-2 text-sm transition-colors ${
        active
          ? "border-b-2 border-emerald-500 text-white"
          : "text-white/50 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
