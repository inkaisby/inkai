"use client";

import { useEffect, useMemo, useState } from "react";

type Column = { name: string; type: string; nullable: string; ordinal: number };

export default function DbViewerPanel() {
  const [tables, setTables] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(25);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/db/tables", { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.message ?? "Gagal memuat tabel");
        return r.json();
      })
      .then((j) => setTables(Array.isArray(j?.tables) ? j.tables : []))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Gagal memuat tabel"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setError(null);

    fetch(`/api/admin/db/columns?${new URLSearchParams({ table: selected })}`, {
      credentials: "include",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.message ?? "Gagal memuat kolom");
        return r.json();
      })
      .then((j) => setColumns(Array.isArray(j?.columns) ? j.columns : []))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Gagal memuat kolom"));
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    setError(null);

    const q = new URLSearchParams({
      table: selected,
      limit: String(limit),
      offset: String(offset),
    });
    fetch(`/api/admin/db/rows?${q.toString()}`, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.message ?? "Gagal memuat data");
        return r.json();
      })
      .then((j) => setRows(Array.isArray(j?.rows) ? j.rows : []))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Gagal memuat data"));
  }, [selected, limit, offset]);

  const visibleTables = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tables;
    return tables.filter((t) => t.toLowerCase().includes(q));
  }, [tables, search]);

  const colNames = useMemo(() => columns.map((c) => c.name), [columns]);

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden h-[640px] flex">
      <aside className="w-72 border-r border-white/10 p-3 flex flex-col gap-2">
        <div className="text-sm font-medium text-white">DB Viewer (Read-only)</div>
        <div className="text-xs text-white/50">
          Preview tabel & kolom untuk kebutuhan teknis.
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari tabel…"
          className="w-full px-2 py-1 text-sm bg-black/30 border border-white/10 rounded"
        />

        <div className="flex-1 overflow-auto">
          {visibleTables.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setSelected(t);
                setOffset(0);
              }}
              className={`w-full text-left px-2 py-2 rounded text-sm ${
                selected === t
                  ? "bg-emerald-500/15 border border-emerald-500/30 text-white"
                  : "text-white/60 hover:bg-white/5"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </aside>

      <main className="flex-1 p-4 min-h-0 overflow-hidden flex flex-col gap-3">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-white/40">
            Pilih tabel untuk melihat detail
          </div>
        ) : (
          <>
            <div className="shrink-0">
              <div className="text-lg font-semibold">Table: {selected}</div>
              <div className="text-xs text-white/40">Read-only preview</div>
            </div>

            <div className="shrink-0 flex items-center gap-3 text-xs">
              <label className="flex items-center gap-2">
                <span className="text-white/50">Limit</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={limit}
                  onChange={(e) => setLimit(Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 25)))}
                  className="w-20 px-2 py-1 bg-black/30 border border-white/10 rounded"
                />
              </label>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  disabled={offset <= 0}
                  onClick={() => setOffset((v) => Math.max(0, v - limit))}
                  className="px-2 py-1 border border-white/10 rounded disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => setOffset((v) => v + limit)}
                  className="px-2 py-1 border border-white/10 rounded"
                >
                  Next
                </button>
              </div>
            </div>

            {loading && <div className="text-sm text-white/40">Memuat…</div>}
            {error && <div className="text-sm text-red-400">{error}</div>}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 min-h-0 overflow-hidden">
              <section className="border border-white/10 rounded-lg p-3 overflow-auto">
                <div className="text-sm font-medium mb-2">Columns</div>
                {!columns.length ? (
                  <div className="text-sm text-white/40">—</div>
                ) : (
                  <ul className="text-sm space-y-1">
                    {columns.map((c) => (
                      <li key={c.name} className="text-white/70">
                        <span className="text-white">{c.name}</span>{" "}
                        <span className="text-white/40">({c.type})</span>{" "}
                        {c.nullable === "NO" && (
                          <span className="text-amber-400 text-xs">required</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="lg:col-span-2 border border-white/10 rounded-lg overflow-auto">
                <div className="min-w-max">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white/5 border-b border-white/10">
                      <tr>
                        {colNames.map((c) => (
                          <th key={c} className="px-2 py-1 text-left text-xs text-white/60 whitespace-nowrap">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(rows ?? []).map((r, i) => (
                        <tr key={i} className="border-t border-white/10">
                          {colNames.map((c) => (
                            <td key={c} className="px-2 py-1 whitespace-nowrap">
                              {formatCell(r?.[c])}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {(!rows || rows.length === 0) && (
                        <tr>
                          <td colSpan={Math.max(1, colNames.length)} className="px-3 py-6 text-center text-white/40">
                            Tidak ada data (atau akses dibatasi)
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function formatCell(v: unknown) {
  if (v === null || v === undefined) return "-";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

