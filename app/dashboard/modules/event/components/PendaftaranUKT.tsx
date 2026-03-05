"use client";

import { useEffect, useState } from "react";
import { useScope } from "@/app/dashboard/components/topbar-premium/context/ScopeContext";
import JarvisLoader from "@/components/JarvisLoader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type TahunAjaran = { id: string; nama: string; tahun: number; periode: string };
type RantingOption = { id: string; nama: string };
type AnggotaAktif = {
  profile_id: string;
  nama: string;
  nomor: string;
  kyu_dan_terakhir: string;
  sudah_daftar: boolean;
};

type Props = {
  onFilterChange?: (tahunId: string, rantingId: string) => void;
  onRegistrationSuccess?: () => void;
};

export default function PendaftaranUKT({ onFilterChange, onRegistrationSuccess }: Props) {
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

  useEffect(() => {
    fetch("/api/ukt/tahun-ajaran", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setTahunList(Array.isArray(data) ? data : []);
        if (Array.isArray(data) && data.length > 0 && !tahunId) setTahunId(data[0].id);
      })
      .catch(() => setTahunList([]))
      .finally(() => setLoadingTahun(false));
  }, []);

  useEffect(() => {
    setLoadingRanting(true);
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
  }, [selectedContext]);

  useEffect(() => {
    onFilterChange?.(tahunId, rantingId);
  }, [tahunId, rantingId, onFilterChange]);

  useEffect(() => {
    if (!rantingId) {
      setAnggota([]);
      return;
    }
    setLoadingAnggota(true);
    const params = new URLSearchParams({ ranting_id: rantingId });
    if (tahunId) params.set("tahun_ajaran_id", tahunId);
    fetch(`/api/ukt/anggota-aktif?${params}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setAnggota(Array.isArray(data) ? data : []))
      .catch(() => setAnggota([]))
      .finally(() => setLoadingAnggota(false));
  }, [rantingId, tahunId]);

  const filtered = anggota.filter(
    (a) =>
      !search.trim() ||
      a.nama.toLowerCase().includes(search.toLowerCase()) ||
      (a.nomor && a.nomor.includes(search))
  );

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
    const tahun = tahunList.find((t) => t.id === tahunId);
    const kyuDanLabel = tahun?.nama ?? "";
    let ok = 0;
    for (const profileId of selected) {
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
        alert(j.message || "Gagal mendaftarkan");
      }
    }
    setSaving(false);
    if (ok > 0) {
      setSelected(new Set());
      onRegistrationSuccess?.();
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
          Pilih tahun ajaran dan ranting, lalu centang anggota yang akan didaftarkan.
        </p>
      </div>

      <div className="flex flex-wrap gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-zinc-400">Tahun Ajaran</label>
          {loadingTahun ? (
            <span className="text-sm text-zinc-500">Memuat…</span>
          ) : (
            <Select value={tahunId || undefined} onValueChange={(v) => setTahunId(v ?? "")}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="— Pilih —" />
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
          <label className="text-xs font-medium text-zinc-400">Ranting</label>
          {loadingRanting ? (
            <span className="text-sm text-zinc-500">Memuat…</span>
          ) : (
            <Select value={rantingId || undefined} onValueChange={(v) => setRantingId(v ?? "")}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="— Pilih —" />
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

      <div className="mt-6 flex flex-col gap-2">
        <label className="text-xs font-medium text-zinc-400">Cari anggota (nama / no. anggota)</label>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ketik untuk filter…"
          className="max-w-xs rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500/50"
        />
      </div>

      {loadingAnggota ? (
        <div className="mt-6"><JarvisLoader label="Memuat anggota aktif…" /></div>
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
                {filtered.map((a) => (
                  <tr key={a.profile_id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      {a.sudah_daftar ? (
                        <span className="text-xs text-zinc-500">Terdaftar</span>
                      ) : (
                        <input
                          type="checkbox"
                          checked={selected.has(a.profile_id)}
                          onChange={() => toggle(a.profile_id)}
                          className="rounded border-white/20"
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-200">{a.nama}</td>
                    <td className="px-4 py-3 text-zinc-400">{a.nomor}</td>
                    <td className="px-4 py-3 text-zinc-400">{a.kyu_dan_terakhir}</td>
                    <td className="px-4 py-3 text-zinc-500">{a.sudah_daftar ? "Sudah daftar" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <p className="mt-4 text-sm text-zinc-500">Tidak ada anggota aktif di ranting ini.</p>
          )}

          {selected.size > 0 && (
            <div className="mt-6 flex items-center gap-3">
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
        </>
      )}
    </div>
  );
}
