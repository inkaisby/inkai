// app/dashboard/modules/settings/components/database/tabs/DataTab.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/app/lib/supabaseBrowser";
import {
  FileText,
  FileSpreadsheet,
  Printer,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type Row = Record<string, unknown>;

interface DataTabProps {
  table: string;
  pageSize?: number;
}

export default function DataTab({ table, pageSize = 25 }: DataTabProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!table) return;

    const fetchRows = async () => {
      setLoading(true);
      setError(null);

      const limit = pageSize;
      const offset = (page - 1) * pageSize;

      const { data, error: sbError } = await supabase.rpc(
        "admin_select_table",
        {
          p_table: table,
          p_limit: limit,
          p_offset: offset,
        },
      );

      if (sbError) {
        setError("Akses tabel dibatasi");
        setRows([]);
      } else {
        // client-side filter (AMAN)
        const filtered =
          filter.trim() && Array.isArray(data)
            ? data.filter((row: Row) =>
                Object.values(row).some((v) =>
                  String(v ?? "")
                    .toLowerCase()
                    .includes(filter.toLowerCase()),
                ),
              )
            : (data ?? []);

        setRows(filtered);
        setSelected(new Set());
      }

      setLoading(false);
      console.groupEnd();
    };

    fetchRows();
  }, [table, page, pageSize, filter]);

  const columns = useMemo(
    () => (rows.length ? Object.keys(rows[0]) : []),
    [rows],
  );

  const toggleRow = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) {
        next.delete(i);
      } else {
        next.add(i);
      }
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? new Set(rows.map((_, i) => i)) : new Set());
  };

  const selectedRows = rows.filter((_, i) => selected.has(i));

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(selectedRows, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${table}.json`;
    a.click();
  };

  const downloadCSV = () => {
    const csv = [
      columns.join(","),
      ...selectedRows.map((r) =>
        columns.map((c) => JSON.stringify(r[c] ?? "")).join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${table}.csv`;
    a.click();
  };

  const printTable = () => {
    const win = window.open("", "_blank");
    if (!win) return;

    const title = `LAPORAN DATA TABEL: ${table.toUpperCase()}`;
    const date = new Date().toLocaleString("id-ID");

    const tableHTML = `
    <table>
      <thead>
        <tr>
          ${columns.map((c) => `<th>${c}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (r) => `
          <tr>
            ${columns
              .map(
                (c) =>
                  `<td>${
                    r[c] === null || r[c] === undefined
                      ? "-"
                      : typeof r[c] === "object"
                        ? JSON.stringify(r[c])
                        : String(r[c])
                  }</td>`,
              )
              .join("")}
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
  `;

    win.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body {
            font-family: "Times New Roman", serif;
            margin: 40px;
            color: #000;
          }
          h1 {
            text-align: center;
            font-size: 16pt;
            margin-bottom: 4px;
          }
          .meta {
            text-align: center;
            font-size: 11pt;
            margin-bottom: 24px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10pt;
          }
          th, td {
            border: 1px solid #000;
            padding: 6px 8px;
            text-align: left;
            vertical-align: top;
          }
          th {
            background: #eee;
          }
          tr {
            page-break-inside: avoid;
          }
          .footer {
            margin-top: 40px;
            font-size: 11pt;
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="meta">Dicetak pada: ${date}</div>
        ${tableHTML}
        <div class="footer">
          <p>Mengetahui,</p>
          <br /><br />
          <p>__________________________</p>
          <p><strong>Administrator Sistem</strong></p>
        </div>
      </body>
    </html>
  `);

    win.document.close();
    win.focus();
    win.print();
  };

  if (loading) return <div className="text-sm text-white/40">Loading…</div>;

  if (error) return <div className="text-sm text-red-400">{error}</div>;

  return (
    <div className="flex flex-col gap-2 h-full min-h-0">
      {/* Toolbar */}
      <div className="flex items-center gap-2 text-xs no-print">
        <input
          value={filter}
          onChange={(e) => {
            setPage(1);
            setFilter(e.target.value);
          }}
          placeholder="Filter…"
          className="bg-black/30 border border-white/10 px-2 py-1 rounded"
        />

        <button onClick={printTable} title="Print">
          <Printer size={16} />
        </button>

        <button
          onClick={downloadJSON}
          disabled={!selected.size}
          title="Download JSON"
        >
          <FileText size={16} />
        </button>

        <button
          onClick={downloadCSV}
          disabled={!selected.size}
          title="Download CSV"
        >
          <FileSpreadsheet size={16} />
        </button>

        <span className="ml-auto opacity-60">Page {page}</span>

        <button onClick={() => setPage((p) => Math.max(1, p - 1))}>◀</button>
        <button onClick={() => setPage((p) => p + 1)}>▶</button>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 border border-white/10 overflow-auto print-area">
        <div className="min-w-max">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white/5 z-10">
              <tr>
                <th className="px-2">
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && selected.size === rows.length}
                    onChange={(e) => toggleAll(e.target.checked)}
                    className="no-print"
                  />
                </th>
                {columns.map((c) => (
                  <th
                    key={c}
                    className="px-2 py-1 text-left text-xs text-white/60 whitespace-nowrap"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-white/10">
                  <td className="px-2 no-print">
                    <input
                      type="checkbox"
                      checked={selected.has(i)}
                      onChange={() => toggleRow(i)}
                    />
                  </td>
                  {columns.map((c) => (
                    <td key={c} className="px-2 py-1 whitespace-nowrap">
                      {r[c] === null || r[c] === undefined
                        ? "-"
                        : typeof r[c] === "object"
                          ? JSON.stringify(r[c])
                          : String(r[c])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end gap-2 text-xs no-print">
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="disabled:opacity-40"
        >
          <ChevronLeft size={14} />
        </button>
        <span>Page {page}</span>
        <button onClick={() => setPage((p) => p + 1)}>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
