"use client";

import { useEffect, useState } from "react";
import JarvisLoader from "@/components/JarvisLoader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type TahunAjaran = { id: string; nama: string; tahun: number; periode: string };
type RantingOption = { id: string; nama: string };
type RiwayatItem = {
  id: string;
  tahun_ajaran_nama: string;
  ranting_nama: string;
  nama: string;
  nomor: string;
  kyu_dan_terakhir: string;
  status_bayar: string;
  total_bayar: number | null;
  file_url: string | null;
  created_at: string;
  dikonfirmasi_at: string | null;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

export default function RiwayatUKT() {
  const [tahunList, setTahunList] = useState<TahunAjaran[]>([]);
  const [rantingList, setRantingList] = useState<RantingOption[]>([]);
  const [tahunId, setTahunId] = useState("");
  const [rantingId, setRantingId] = useState("");
  const [list, setList] = useState<RiwayatItem[]>([]);
  const [loadingTahun, setLoadingTahun] = useState(true);
  const [loadingRanting, setLoadingRanting] = useState(true);
  const [loadingList, setLoadingList] = useState(false);

  useEffect(() => {
    fetch("/api/ukt/tahun-ajaran", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const arr = Array.isArray(d) ? d : [];
        setTahunList(arr);
      })
      .finally(() => setLoadingTahun(false));
  }, []);

  useEffect(() => {
    queueMicrotask(() => setLoadingRanting(true));
    fetch("/api/ranting", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const arr = Array.isArray(d) ? d : [];
        setRantingList(arr);
      })
      .finally(() => setLoadingRanting(false));
  }, []);

  useEffect(() => {
    queueMicrotask(() => setLoadingList(true));
    const params = new URLSearchParams();
    if (tahunId) params.set("tahun_ajaran_id", tahunId);
    if (rantingId) params.set("ranting_id", rantingId);
    fetch(`/api/ukt/riwayat?${params.toString()}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setList(Array.isArray(d?.list) ? d.list : []);
      })
      .catch(() => setList([]))
      .finally(() => setLoadingList(false));
  }, [tahunId, rantingId]);

  const statusLabel = (s: string) => {
    switch (s) {
      case "lunas":
        return "Lunas";
      case "bukti_uploaded":
        return "Bukti diupload";
      case "menunggu_bayar":
        return "Menunggu bayar";
      default:
        return s;
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-zinc-100">Riwayat UKT</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Daftar pendaftaran UKT (semua tahun/ranting dalam scope). Filter opsional untuk mempersempit.
        </p>
      </div>

      <div className="flex flex-wrap gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-zinc-400">Tahun Ajaran (opsional)</label>
          {loadingTahun ? (
            <span className="text-sm text-zinc-500">Memuat…</span>
          ) : (
            <Select value={tahunId || undefined} onValueChange={(v) => setTahunId(v ?? "")}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Semua tahun" />
              </SelectTrigger>
              <SelectContent position="popper">
                {tahunList.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.nama}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-zinc-400">Ranting (opsional)</label>
          {loadingRanting ? (
            <span className="text-sm text-zinc-500">Memuat…</span>
          ) : (
            <Select value={rantingId || undefined} onValueChange={(v) => setRantingId(v ?? "")}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Semua ranting" />
              </SelectTrigger>
              <SelectContent position="popper">
                {rantingList.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.nama}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {loadingList ? (
        <div className="mt-6">
          <JarvisLoader label="Memuat riwayat…" />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-left text-zinc-400">
                <th className="px-4 py-3">Tahun Ajaran</th>
                <th className="px-4 py-3">Ranting</th>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">No. Anggota</th>
                <th className="px-4 py-3">Kyu/Dan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Tgl Daftar</th>
                <th className="px-4 py-3">Tgl Lunas</th>
                <th className="px-4 py-3">Bukti</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-zinc-300">{r.tahun_ajaran_nama}</td>
                  <td className="px-4 py-3 text-zinc-400">{r.ranting_nama}</td>
                  <td className="px-4 py-3 text-zinc-200">{r.nama}</td>
                  <td className="px-4 py-3 text-zinc-400">{r.nomor}</td>
                  <td className="px-4 py-3 text-zinc-400">{r.kyu_dan_terakhir || "—"}</td>
                  <td className="px-4 py-3">
                    {r.status_bayar === "lunas" ? (
                      <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400/90">
                        {statusLabel(r.status_bayar)}
                      </span>
                    ) : (
                      <span className="text-zinc-500 text-xs">{statusLabel(r.status_bayar)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {r.total_bayar != null
                      ? "Rp " + Number(r.total_bayar).toLocaleString("id-ID")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">{formatDate(r.created_at)}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">{formatDate(r.dikonfirmasi_at)}</td>
                  <td className="px-4 py-3">
                    {r.file_url ? (
                      <a
                        href={r.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-400/90 text-xs underline hover:text-amber-300/90"
                      >
                        Lihat
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-zinc-500">
              Belum ada riwayat pendaftaran UKT.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
