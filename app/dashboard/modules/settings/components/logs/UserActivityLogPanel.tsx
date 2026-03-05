"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/app/lib/supabaseBrowser";

import JarvisLoader from "@/components/JarvisLoader";

interface LogRow {
  id: string;
  email: string | null;
  action: string;
  module: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
}

interface Props {
  email: string | null;
}

export default function UserActivityLogPanel({ email }: Props) {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [testLogSending, setTestLogSending] = useState(false);

  useEffect(() => {
    if (!email?.trim()) return;
    let mounted = true;
    const url = `/api/activity/logs?email=${encodeURIComponent(email.trim())}`;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(url, { credentials: "include" });
        const data = res.ok ? (await res.json()) : [];
        if (mounted) setLogs(Array.isArray(data) ? data : []);
      } catch {
        if (mounted) setLogs([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [email]);

  /* Realtime: log baru untuk email ini langsung tampil */
  useEffect(() => {
    if (!email?.trim()) return;

    const channel = supabase
      .channel(`activity_logs:${email.trim()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_activity_logs",
          filter: `email=eq.${email.trim()}`,
        },
        (payload) => {
          const newRow = payload.new as LogRow;
          if (newRow?.id)
            setLogs((prev) => [newRow, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [email]);

  if (!email) {
    return (
      <div className="text-sm text-white/50">
        Pilih pengguna untuk melihat log aktivitas.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <JarvisLoader label="Memuat log aktivitas…" />
      </div>
    );
  }

  const addTestLog = async () => {
    if (!email?.trim() || testLogSending) return;
    setTestLogSending(true);
    try {
      const res = await fetch("/api/activity/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
          action: "log_uji",
          module: "settings",
          detail: { source: "tombol uji", waktu: new Date().toISOString() },
        }),
      });
      if (!res.ok) {
        const msg = (await res.json().catch(() => ({}))).message ?? "Gagal";
        alert(msg);
        return;
      }
      const refetch = await fetch(
        `/api/activity/logs?email=${encodeURIComponent(email.trim())}`,
        { credentials: "include" }
      );
      const data = refetch.ok ? (await refetch.json()) : [];
      setLogs(Array.isArray(data) ? data : []);
    } finally {
      setTestLogSending(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* KETERANGAN */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-sm text-white/70">
          Log email:
          <span className="ml-2 font-mono text-blue-400">{email}</span>
        </div>
        <button
          type="button"
          onClick={addTestLog}
          disabled={testLogSending}
          className="text-sm px-3 py-1.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 disabled:opacity-50"
        >
          {testLogSending ? "Mengirim…" : "Tambah log uji"}
        </button>
      </div>

      {/* TABLE */}
      <div className="border border-white/10 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5">
            <tr>
              <th className="p-3 text-left w-44">Waktu</th>
              <th className="p-3 text-left">Aksi</th>
              <th className="p-3 text-left">Modul</th>
              <th className="p-3 text-left">Detail</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr
                key={l.id}
                className="border-t border-white/10 hover:bg-white/5"
              >
                <td className="p-3 font-mono text-xs">
                  {new Date(l.created_at).toLocaleString("id-ID")}
                </td>
                <td className="p-3">{l.action}</td>
                <td className="p-3">{l.module ?? "-"}</td>
                <td className="p-3 text-xs text-white/70 max-w-[240px] truncate" title={l.detail ? JSON.stringify(l.detail) : undefined}>
                  {l.detail
                    ? typeof l.detail === "object" && l.detail !== null
                      ? Object.entries(l.detail)
                          .map(([k, v]) =>
                            Array.isArray(v) ? `${k}: ${v.join(", ")}` : `${k}: ${v == null ? "" : String(v)}`
                          )
                          .join(" · ") || "-"
                      : String(l.detail)
                    : "-"}
                </td>
              </tr>
            ))}

            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-white/50">
                  Belum ada aktivitas tercatat
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
