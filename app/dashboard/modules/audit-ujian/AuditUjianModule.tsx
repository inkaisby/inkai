"use client";

import { useEffect, useState } from "react";
import { getPrefetch } from "@/app/dashboard/lib/prefetchCache";

type UjianRow = {
  id: string;
  judul: string;
  kategori: string;
  tingkat: string;
  tanggal: string;
  status: string;
  created_at: string;
};

type HasilRow = {
  id: string;
  nilai: number;
  nilai_maks: number;
  lulus: boolean;
  target_tingkat: string;
  created_at: string;
};

type Ringkasan = {
  totalUjian: number;
  totalPeserta: number;
  pesertaLulus: number;
  ujianTerbaru: UjianRow[];
  hasilTerbaru: HasilRow[];
};

export default function AuditUjianModule() {
  const [data, setData] = useState<Ringkasan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const cached = getPrefetch<Ringkasan>("audit-ujian-ringkasan");
    if (cached) {
      setData(cached);
      setLoading(false);
    }

    fetch("/api/audit-ujian/ringkasan", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || "Gagal memuat data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Audit Ujian</h1>
          <p className="text-sm text-white/60 mt-1">
            Ringkasan ujian, peserta, dan hasil dari tabel ujian, ujian_peserta, ujian_hasil di Supabase.
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-white/50">
          Memuat ringkasan…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Audit Ujian</h1>
        </div>
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300 text-sm">
          {error}
        </div>
      </div>
    );
  }

  const r = data!;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Audit Ujian</h1>
        <p className="text-sm text-white/60 mt-1">
          Ringkasan ujian, peserta, dan hasil dari tabel ujian, ujian_peserta, ujian_hasil di Supabase.
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-cyan-300">Ringkasan</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
            <div className="text-2xl font-bold text-cyan-400">{r.totalUjian}</div>
            <div className="text-xs text-white/60">Total ujian</div>
          </div>
          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
            <div className="text-2xl font-bold text-cyan-400">{r.totalPeserta}</div>
            <div className="text-xs text-white/60">Total peserta (ujian_peserta)</div>
          </div>
          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
            <div className="text-2xl font-bold text-cyan-400">{r.pesertaLulus}</div>
            <div className="text-xs text-white/60">Peserta lulus (ujian_hasil.lulus)</div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-sm font-semibold text-cyan-300 mb-3">Ujian terbaru (tabel ujian)</h2>
        {r.ujianTerbaru.length === 0 ? (
          <p className="text-sm text-white/50">Belum ada data ujian.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-white/60 border-b border-white/10">
                  <th className="pb-2 pr-4">Judul</th>
                  <th className="pb-2 pr-4">Kategori</th>
                  <th className="pb-2 pr-4">Tingkat</th>
                  <th className="pb-2 pr-4">Tanggal</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {r.ujianTerbaru.map((row) => (
                  <tr key={row.id} className="border-b border-white/5">
                    <td className="py-2 pr-4 text-cyan-300">{row.judul}</td>
                    <td className="py-2 pr-4">{row.kategori}</td>
                    <td className="py-2 pr-4">{row.tingkat || "—"}</td>
                    <td className="py-2 pr-4 text-white/70">
                      {row.tanggal
                        ? new Date(row.tanggal).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="py-2">
                      <span
                        className={
                          row.status === "selesai"
                            ? "text-emerald-400"
                            : row.status === "dibuka"
                              ? "text-amber-400"
                              : "text-white/50"
                        }
                      >
                        {row.status || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-sm font-semibold text-cyan-300 mb-3">Hasil terbaru (tabel ujian_hasil)</h2>
        {r.hasilTerbaru.length === 0 ? (
          <p className="text-sm text-white/50">Belum ada hasil ujian.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-white/60 border-b border-white/10">
                  <th className="pb-2 pr-4">Nilai</th>
                  <th className="pb-2 pr-4">Target tingkat</th>
                  <th className="pb-2 pr-4">Lulus</th>
                  <th className="pb-2">Tanggal</th>
                </tr>
              </thead>
              <tbody>
                {r.hasilTerbaru.map((row) => (
                  <tr key={row.id} className="border-b border-white/5">
                    <td className="py-2 pr-4">
                      {row.nilai} / {row.nilai_maks}
                    </td>
                    <td className="py-2 pr-4">{row.target_tingkat || "—"}</td>
                    <td className="py-2 pr-4">
                      <span className={row.lulus ? "text-emerald-400" : "text-red-400"}>
                        {row.lulus ? "Lulus" : "Tidak lulus"}
                      </span>
                    </td>
                    <td className="py-2 text-white/50">
                      {row.created_at
                        ? new Date(row.created_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
