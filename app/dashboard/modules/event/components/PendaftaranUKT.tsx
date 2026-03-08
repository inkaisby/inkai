"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

const STORAGE_KEY_UKT_PENDING = "ukt_pending_selection";

function getStoredSelection(tahunId: string, rantingId: string): string[] {
  if (typeof window === "undefined" || !tahunId || !rantingId) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_UKT_PENDING);
    if (!raw) return [];
    const obj = JSON.parse(raw) as Record<string, string[]>;
    const key = `${tahunId}|${rantingId}`;
    return Array.isArray(obj[key]) ? obj[key] : [];
  } catch {
    return [];
  }
}

function setStoredSelection(
  tahunId: string,
  rantingId: string,
  profileIds: string[],
) {
  if (typeof window === "undefined" || !tahunId || !rantingId) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_UKT_PENDING);
    const obj: Record<string, string[]> = raw
      ? (JSON.parse(raw) as Record<string, string[]>)
      : {};
    obj[`${tahunId}|${rantingId}`] = profileIds;
    localStorage.setItem(STORAGE_KEY_UKT_PENDING, JSON.stringify(obj));
  } catch {
    /* ignore */
  }
}
import { toast } from "react-hot-toast";
import { QRCodeSVG } from "qrcode.react";
import { useScope } from "@/app/dashboard/components/topbar-premium/context/ScopeContext";
import JarvisLoader from "@/components/JarvisLoader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TahunAjaran = {
  id: string;
  nama: string;
  tahun: number;
  periode: string;
  cabang_id?: string | null;
  tanggal?: string | null;
  tempat?: string | null;
  qris_content?: string | null;
};
type RantingOption = { id: string; nama: string };
type AnggotaAktif = {
  profile_id: string;
  nama: string;
  nomor: string;
  kyu_dan_terakhir: string;
  sudah_daftar: boolean;
  sudah_batal?: boolean;
};

function formatTanggal(iso: string): string {
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

export type AnggotaAktifSelected = {
  profile_id: string;
  nama: string;
  nomor: string;
  kyu_dan_terakhir: string;
};

type Props = {
  onFilterChange?: (tahunId: string, rantingId: string) => void;
  onRegistrationSuccess?: () => void;
  onSelectionChange?: (members: AnggotaAktifSelected[]) => void;
  /** Jika berubah, daftar anggota di-refetch (mis. setelah batal ikut). */
  refreshTrigger?: number;
};

export default function PendaftaranUKT({
  onFilterChange,
  onRegistrationSuccess,
  onSelectionChange,
  refreshTrigger,
}: Props) {
  const { selectedContext } = useScope();
  const [tahunList, setTahunList] = useState<TahunAjaran[]>([]);
  const [rantingList, setRantingList] = useState<RantingOption[]>([]);
  const [tahunId, setTahunId] = useState("");
  const [rantingId, setRantingId] = useState("");
  const [anggota, setAnggota] = useState<AnggotaAktif[]>([]);
  const [loadingTahun, setLoadingTahun] = useState(true);
  const [loadingRanting, setLoadingRanting] = useState(true);
  const [loadingAnggota, setLoadingAnggota] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  // Collapse per grup status: "sudah_daftar" default collapsed, "batal" dan "belum" terbuka
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(["sudah_daftar"]));

  useEffect(() => {
    fetch("/api/ukt/tahun-ajaran", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setTahunList(Array.isArray(data) ? data : []);
        if (Array.isArray(data) && data.length > 0 && !tahunId)
          setTahunId(data[0].id);
      })
      .catch(() => setTahunList([]))
      .finally(() => setLoadingTahun(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only: init tahun list once
  }, []);

  useEffect(() => {
    queueMicrotask(() => setLoadingRanting(true));
    fetch("/api/ranting", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setRantingList(list);
        const ctxRanting =
          selectedContext && selectedContext !== "all"
            ? list.find((r: RantingOption) => r.id === selectedContext)
            : null;
        if (ctxRanting && !rantingId) setRantingId(ctxRanting.id);
        else if (list.length > 0 && !rantingId) setRantingId(list[0].id);
      })
      .catch(() => setRantingList([]))
      .finally(() => setLoadingRanting(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ranting list by selectedContext only
  }, [selectedContext]);

  useEffect(() => {
    onFilterChange?.(tahunId, rantingId);
  }, [tahunId, rantingId, onFilterChange]);

  useEffect(() => {
    if (!rantingId) {
      queueMicrotask(() => setAnggota([]));
      return;
    }
    queueMicrotask(() => setLoadingAnggota(true));
    const params = new URLSearchParams({ ranting_id: rantingId });
    if (tahunId) params.set("tahun_ajaran_id", tahunId);
    fetch(`/api/ukt/anggota-aktif?${params}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setAnggota(Array.isArray(data) ? data : []))
      .catch(() => setAnggota([]))
      .finally(() => setLoadingAnggota(false));
  }, [rantingId, tahunId, refreshTrigger]);

  // Restore centang dari localStorage setelah anggota load (agar tetap ada setelah refresh)
  useEffect(() => {
    if (!tahunId || !rantingId || anggota.length === 0) return;
    const stored = getStoredSelection(tahunId, rantingId);
    const valid = stored.filter((id) =>
      anggota.some((a) => a.profile_id === id && !a.sudah_daftar),
    );
    if (valid.length > 0) {
      queueMicrotask(() => {
        setSelected((prev) => {
          const next = new Set(valid);
          if (prev.size === next.size && valid.every((id) => prev.has(id)))
            return prev;
          return next;
        });
      });
    }
  }, [tahunId, rantingId, anggota]);

  // Simpan centang ke localStorage saat berubah
  useEffect(() => {
    if (!tahunId || !rantingId) return;
    const ids = Array.from(selected);
    setStoredSelection(tahunId, rantingId, ids);
  }, [tahunId, rantingId, selected]);

  useEffect(() => {
    if (!onSelectionChange) return;
    if (selected.size === 0) {
      onSelectionChange([]);
      return;
    }
    const list = anggota
      .filter((a) => selected.has(a.profile_id))
      .map((a) => ({
        profile_id: a.profile_id,
        nama: a.nama,
        nomor: a.nomor ?? "",
        kyu_dan_terakhir: a.kyu_dan_terakhir ?? "",
      }));
    onSelectionChange(list);
  }, [selected, anggota, onSelectionChange]);

  const filtered = useMemo(
    () =>
      anggota.filter(
        (a) =>
          !search.trim() ||
          a.nama.toLowerCase().includes(search.toLowerCase()) ||
          (a.nomor && a.nomor.includes(search)),
      ),
    [anggota, search],
  );

  const groups = useMemo(() => {
    const sudahDaftar = filtered.filter((a) => a.sudah_daftar);
    const batal = filtered.filter((a) => !a.sudah_daftar && a.sudah_batal);
    const belum = filtered.filter((a) => !a.sudah_daftar && !a.sudah_batal);
    return [
      { key: "sudah_daftar", label: "Sudah daftar", items: sudahDaftar },
      { key: "batal", label: "Batal", items: batal },
      { key: "belum", label: "Belum daftar", items: belum },
    ] as const;
  }, [filtered]);

  const toggleCollapse = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggle = (profileId: string) => {
    const a = anggota.find((x) => x.profile_id === profileId);
    if (a?.sudah_daftar) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(profileId)) next.delete(profileId);
      else next.add(profileId);
      return next;
    });
  };

  const handleSimpan = async () => {
    if (!tahunId || !rantingId || selected.size === 0) return;
    setSaving(true);
    let ok = 0;
    const selectedIds = Array.from(selected);
    for (const profileId of selectedIds) {
      const a = anggota.find((x) => x.profile_id === profileId);
      const res = await fetch("/api/ukt/pendaftaran", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          tahun_ajaran_id: tahunId,
          profile_id: profileId,
          ranting_id: rantingId,
          kyu_dan_terakhir: a?.kyu_dan_terakhir ?? "",
        }),
      });
      if (res.ok) ok++;
      else {
        const j = await res.json().catch(() => ({}));
        toast.error((j.message as string) || "Gagal mendaftarkan");
      }
    }
    setSaving(false);
    if (ok > 0) {
      setSelected(new Set());
      onRegistrationSuccess?.();
      toast.success(
        `${ok} peserta berhasil didaftarkan. Upload bukti & konfirmasi lunas di kolom kanan.`,
        { duration: 5000 },
      );
      const params = new URLSearchParams({ ranting_id: rantingId });
      if (tahunId) params.set("tahun_ajaran_id", tahunId);
      fetch(`/api/ukt/anggota-aktif?${params}`, { credentials: "include" })
        .then((r) => r.json())
        .then((data) => setAnggota(Array.isArray(data) ? data : []));
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-zinc-100">Pendaftaran UKT</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Pilih tahun ajaran dan ranting. Tabel menampilkan{" "}
          <strong>anggota aktif di ranting</strong>; yang belum terdaftar UKT
          bisa dicentang untuk didaftarkan.
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Centang anggota lalu klik &quot;Daftarkan X peserta&quot; untuk
          menyimpan. Baris dengan status &quot;Sudah daftar&quot; tidak bisa
          dicentang. Hasil centang tampil di kolom kanan sebagai &quot;Menunggu
          simpan&quot;.
        </p>
      </div>

      <div className="flex flex-wrap gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-zinc-400">
            Tahun Ajaran
          </label>
          {loadingTahun ? (
            <span className="text-sm text-zinc-500">Memuat…</span>
          ) : (
            <Select
              value={tahunId || undefined}
              onValueChange={(v) => setTahunId(v ?? "")}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="— Pilih —" />
              </SelectTrigger>
              <SelectContent position="popper">
                {tahunList.map((t) => {
                  const badge = t.cabang_id ? " (Cabang)" : " (Global)";
                  const detail =
                    t.tanggal || t.tempat
                      ? ` — ${t.tanggal ? formatTanggal(t.tanggal) : ""}${t.tanggal && t.tempat ? ", " : ""}${t.tempat ?? ""}`.trim()
                      : "";
                  const label = `${t.nama}${badge}${detail}`;
                  return (
                    <SelectItem key={t.id} value={t.id}>
                      {label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-zinc-400">Ranting</label>
          {loadingRanting ? (
            <span className="text-sm text-zinc-500">Memuat…</span>
          ) : (
            <Select
              value={rantingId || undefined}
              onValueChange={(v) => setRantingId(v ?? "")}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="— Pilih —" />
              </SelectTrigger>
              <SelectContent position="popper">
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

      {tahunId &&
        (() => {
          const selectedTahun = tahunList.find((t) => t.id === tahunId);
          const qris = selectedTahun?.qris_content?.trim();
          if (!qris) return null;
          return (
            <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-sm font-medium text-zinc-200">
                Bayar via QRIS — {selectedTahun.nama}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Scan QR di bawah untuk transfer/pembayaran UKT.
              </p>
              <div className="mt-3 flex items-start gap-4">
                <div className="rounded-lg border border-white/10 bg-white p-2">
                  <QRCodeSVG value={qris} size={140} level="M" />
                </div>
              </div>
            </div>
          );
        })()}

      <div className="mt-6 flex flex-col gap-2">
        <label className="text-xs font-medium text-zinc-400">
          Cari anggota (nama / no. anggota)
        </label>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ketik untuk filter…"
          className="max-w-xs rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500/50"
        />
      </div>

      {selected.size > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <span className="text-sm text-zinc-300">
            <span className="font-medium text-amber-400/90">
              {selected.size}
            </span>{" "}
            peserta terpilih
          </span>
          <button
            type="button"
            onClick={handleSimpan}
            disabled={saving}
            className="rounded-lg bg-amber-600/90 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
          >
            {saving ? "Menyimpan…" : `Daftarkan ${selected.size} peserta`}
          </button>
        </div>
      )}

      {loadingAnggota ? (
        <div className="mt-6">
          <JarvisLoader label="Memuat anggota aktif…" />
        </div>
      ) : (
        <>
          <div className="mt-6 overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-left text-zinc-400">
                  <th className="px-4 py-3 w-12">Daftar</th>
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">No. Anggota</th>
                  <th className="px-4 py-3">Kyu/Dan</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {groups.map(({ key, label, items }) => {
                  if (items.length === 0) return null;
                  const isOpen = !collapsed.has(key);
                  return (
                    <React.Fragment key={key}>
                      <tr
                        className="border-b border-white/10 bg-white/[0.04]"
                      >
                        <td colSpan={5} className="px-4 py-2">
                          <button
                            type="button"
                            onClick={() => toggleCollapse(key)}
                            className="flex w-full items-center gap-2 text-left text-sm font-medium text-zinc-300 hover:text-zinc-100"
                          >
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4 shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 shrink-0" />
                            )}
                            {label}
                            <span className="text-zinc-500 font-normal">
                              ({items.length})
                            </span>
                          </button>
                        </td>
                      </tr>
                      {isOpen &&
                        items.map((a) => (
                          <tr
                            key={a.profile_id}
                            className="border-b border-white/5 hover:bg-white/[0.02]"
                          >
                            <td className="px-4 py-3">
                              {a.sudah_daftar ? (
                                <span className="text-xs text-zinc-500">
                                  Terdaftar
                                </span>
                              ) : (
                                <input
                                  type="checkbox"
                                  checked={selected.has(a.profile_id)}
                                  onChange={() => toggle(a.profile_id)}
                                  className="rounded border-white/20"
                                />
                              )}
                            </td>
                            <td className="px-4 py-3 text-zinc-200">
                              {a.nama}
                            </td>
                            <td className="px-4 py-3 text-zinc-400">
                              {a.nomor}
                            </td>
                            <td className="px-4 py-3 text-zinc-400">
                              {a.kyu_dan_terakhir}
                            </td>
                            <td className="px-4 py-3">
                              {a.sudah_daftar ? (
                                <span className="text-zinc-500">
                                  Sudah daftar
                                </span>
                              ) : a.sudah_batal ? (
                                <span className="text-amber-400/90">Batal</span>
                              ) : (
                                <span className="text-zinc-500">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <p className="mt-4 text-sm text-zinc-500">
              Tidak ada anggota aktif di ranting ini.
            </p>
          )}
        </>
      )}
    </div>
  );
}
