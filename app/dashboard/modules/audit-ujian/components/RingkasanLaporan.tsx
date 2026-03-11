"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import JarvisLoader from "@/components/JarvisLoader";
import { useScope } from "@/app/dashboard/components/topbar-premium/context/ScopeContext";
import { useBootstrapStore } from "@/app/dashboard/store/bootstrapStore";

type TahunAjaran = { id: string; nama: string; tahun?: number; periode?: string };
type RantingOption = { id: string; nama: string };

type LaporanRow = {
  id: string;
  profile_id: string;
  nama: string;
  nomor: string;
  ranting_id: string;
  ranting_nama: string;
  cabang_nama: string;
  kyu_dan_terakhir: string;
  tingkat_lulus: number | null;
  tingkat_lulus_label: string;
  dikonfirmasi_at: string | null;
  created_at: string;
};

const RANTING_ALL = "all";

function formatTanggal(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function useIsLevel3OrAbove(): boolean {
  const user = useBootstrapStore((s) => s.data?.user);
  return useMemo(() => {
    if (user?.scope?.is_pp) return true;
    const appRole = (user?.app_role as string)?.toUpperCase();
    if (appRole === "SUPERADMIN") return true;
    const roles = (user?.structural_roles ?? []) as Array<{ structural_level?: number; active?: boolean }>;
    const fromRoles = roles.filter((r) => r.active !== false).map((r) => r.structural_level ?? 0);
    const fromProfile = user?.profile_structural_level != null ? [user.profile_structural_level] : [];
    const maxLevel = Math.max(0, ...fromRoles, ...fromProfile);
    return maxLevel >= 3;
  }, [user]);
}

export default function RingkasanLaporan() {
  const { selectedContext } = useScope();
  const isLevel3OrAbove = useIsLevel3OrAbove();
  const [tahunList, setTahunList] = useState<TahunAjaran[]>([]);
  const [rantingList, setRantingList] = useState<RantingOption[]>([]);
  const [tahunId, setTahunId] = useState("");
  const [rantingId, setRantingId] = useState("");
  const [list, setList] = useState<LaporanRow[]>([]);
  const [tahunNama, setTahunNama] = useState<string | null>(null);
  const [loadingTahun, setLoadingTahun] = useState(true);
  const [loadingRanting, setLoadingRanting] = useState(true);
  const [loadingLaporan, setLoadingLaporan] = useState(false);

  useEffect(() => {
    fetch("/api/ukt/tahun-ajaran", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        const arr = Array.isArray(data) ? data : [];
        setTahunList(arr);
        if (arr.length > 0) setTahunId((prev) => prev || arr[0].id);
      })
      .catch(() => setTahunList([]))
      .finally(() => setLoadingTahun(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) setLoadingRanting(true); });
    fetch("/api/ranting", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const arr = Array.isArray(data) ? data : [];
        setRantingList(arr);
        const ctxRanting =
          selectedContext && selectedContext !== "all"
            ? arr.find((r: RantingOption) => r.id === selectedContext)
            : null;
        setRantingId((prev) => {
          if (prev) return prev;
          if (isLevel3OrAbove && arr.length > 0) return RANTING_ALL;
          if (ctxRanting) return ctxRanting.id;
          if (arr.length > 0) return arr[0].id;
          return "";
        });
      })
      .catch(() => { if (!cancelled) setRantingList([]); })
      .finally(() => { if (!cancelled) setLoadingRanting(false); });
    return () => { cancelled = true; };
  }, [selectedContext, isLevel3OrAbove]);

  useEffect(() => {
    if (!tahunId) {
      queueMicrotask(() => {
        setList([]);
        setTahunNama(null);
      });
      return;
    }
    queueMicrotask(() => setLoadingLaporan(true));
    const params = new URLSearchParams({ tahun_ajaran_id: tahunId });
    if (rantingId && rantingId !== RANTING_ALL) params.set("ranting_id", rantingId);
    let cancelled = false;
    fetch(`/api/ukt/laporan?${params}`, { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setList(Array.isArray(data?.list) ? data.list : []);
          setTahunNama(data?.tahun_nama ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setList([]);
          setTahunNama(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingLaporan(false);
      });
    return () => { cancelled = true; };
  }, [tahunId, rantingId]);

  const canFilter = tahunId && (loadingTahun === false);
  const showTable = canFilter && !loadingLaporan;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
        <h3 className="mb-4 text-base font-semibold text-zinc-100">
          Laporan Peserta Lulus UKT
        </h3>
        <p className="mb-4 text-sm text-zinc-500">
          Data peserta yang lunas dan lulus UKT untuk keperluan penerbitan ijazah.
        </p>

        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[200px]">
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">
              Tahun Ajaran
            </label>
            {loadingTahun ? (
              <div className="h-10 rounded-lg border border-white/10 bg-white/5 animate-pulse" />
            ) : (
              <Select value={tahunId} onValueChange={setTahunId}>
                <SelectTrigger className="border-white/10 bg-white/[0.03]">
                  <SelectValue placeholder="Pilih tahun ajaran" />
                </SelectTrigger>
                <SelectContent>
                  {tahunList.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="min-w-[200px]">
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">
              Ranting
            </label>
            {loadingRanting ? (
              <div className="h-10 rounded-lg border border-white/10 bg-white/5 animate-pulse" />
            ) : (
              <Select value={rantingId} onValueChange={setRantingId}>
                <SelectTrigger className="border-white/10 bg-white/[0.03]">
                  <SelectValue placeholder="Pilih ranting" />
                </SelectTrigger>
                <SelectContent>
                  {isLevel3OrAbove && (
                    <SelectItem value={RANTING_ALL}>Semua Ranting</SelectItem>
                  )}
                  {rantingList.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      {!canFilter ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] py-12 text-center text-sm text-zinc-500">
          Pilih tahun ajaran untuk menampilkan laporan.
        </div>
      ) : loadingLaporan ? (
        <div className="flex justify-center py-12">
          <JarvisLoader />
        </div>
      ) : showTable ? (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
          {tahunNama && (
            <div className="border-b border-white/10 px-6 py-3 text-sm font-medium text-zinc-300">
              Tahun Ajaran: {tahunNama}
              {rantingId && rantingId !== RANTING_ALL && (
                <span className="ml-2 text-zinc-500">
                  • Filter: {rantingList.find((r) => r.id === rantingId)?.nama ?? rantingId}
                </span>
              )}
            </div>
          )}
          {list.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-zinc-500">
              Tidak ada peserta lulus untuk filter yang dipilih.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02]">
                    <th className="px-4 py-3 text-left font-medium text-zinc-400">No</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-400">Nama</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-400">No. Anggota</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-400">Ranting</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-400">Cabang</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-400">Kyu Saat Daftar</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-400">Tingkat Lulus</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-400">Dikonfirmasi</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((row, idx) => (
                    <tr
                      key={row.id}
                      className="border-b border-white/5 hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3 text-zinc-400">{idx + 1}</td>
                      <td className="px-4 py-3 text-zinc-200">{row.nama || "—"}</td>
                      <td className="px-4 py-3 text-zinc-400">{row.nomor || "—"}</td>
                      <td className="px-4 py-3 text-zinc-300">{row.ranting_nama || "—"}</td>
                      <td className="px-4 py-3 text-zinc-400">{row.cabang_nama || "—"}</td>
                      <td className="px-4 py-3 text-zinc-300">{row.kyu_dan_terakhir || "—"}</td>
                      <td className="px-4 py-3 text-zinc-300">{row.tingkat_lulus_label || "—"}</td>
                      <td className="px-4 py-3 text-zinc-400">
                        {formatTanggal(row.dikonfirmasi_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
