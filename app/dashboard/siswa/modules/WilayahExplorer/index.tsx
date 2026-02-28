"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/app/lib/supabaseBrowser";

type Wilayah = {
  id: string;
  name: string;
  level: "PROVINSI" | "CABANG" | "RANTING" | "AFILIASI";
  parent_id: string | null;
  created_at: string;
};

export default function WilayahExplorer() {
  const [data, setData] = useState<Wilayah[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWilayah();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadWilayah() {
    setLoading(true);

    const res = await supabase
      .from("wilayah")
      .select("id,name,level,parent_id,created_at")
      .order("created_at", { ascending: true });

    if (res.error) {
      console.error("FETCH WILAYAH ERROR:", res.error);
      setData([]);
    } else {
      setData(res.data ?? []);
    }

    setLoading(false);
  }

  if (loading) {
    return <div className="p-3 text-xs text-slate-500">Loading wilayah…</div>;
  }

  const roots = data.filter((w) => w.parent_id === null);

  return (
    <div className="p-3 space-y-2 text-sm">
      <div className="text-xs text-slate-400 uppercase">Wilayah</div>

      {roots.map((w) => (
        <div key={w.id} className="rounded bg-slate-800/60 px-3 py-2">
          <div className="font-medium text-white">{w.name}</div>
          <div className="text-xs text-slate-400">{w.level}</div>
        </div>
      ))}

      {roots.length === 0 && (
        <div className="text-xs text-slate-500">Tidak ada wilayah</div>
      )}
    </div>
  );
}
