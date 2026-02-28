"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/app/lib/supabaseBrowser";

import JarvisLoader from "@/components/JarvisLoader";

interface LogRow {
  id: string;
  email: string | null;
  action: string;
  module: string | null;
  detail: any;
  created_at: string;
}

interface Props {
  email: string | null;
}

export default function UserActivityLogPanel({ email }: Props) {
 
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!email) return;

    let mounted = true;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("user_activity_logs")
        .select("*")
        .eq("email", email)
        .order("created_at", { ascending: false })
        .limit(200);

      if (mounted) {
        setLogs(data ?? []);
        setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [supabase, email]);

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

  return (
    <div className="space-y-3">
      {/* KETERANGAN */}
      <div className="text-sm text-white/70">
        Log email:
        <span className="ml-2 font-mono text-blue-400">{email}</span>
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
                <td className="p-3 text-xs text-white/70">
                  {l.detail ? JSON.stringify(l.detail) : "-"}
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
