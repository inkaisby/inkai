"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Users,
  UserCheck,
  Trophy,
  CreditCard,
  MapPin,
  Building2,
  PlusCircle,
  Trash2,
  Info,
} from "lucide-react";

import { useScope } from "@/app/dashboard/components/topbar-premium/context/ScopeContext";

type RantingRow = {
  id: string;
  nama: string;
  aktif: boolean;
  cabang_id: string | null;
  province_id: number | null;
  regency_id: number | null;
  district_id: number | null;
  instagram_url: string | null;
};

type ProvinsiOption = { id: string; nama: string };

type CabangOption = {
  id: string;
  nama: string;
  provinsi_id: string;
  aktif: boolean;
};

/** Kabupaten/Kota dari API wilayah (regencies) — untuk filter manual */
type WilayahOption = { id: string; name: string };

type PaymentRow = {
  id: string;
  nama: string;
  jenis: string;
  event: string;
  nominal: number;
  tanggal: string;
};

const accentCard =
  "rounded-lg border border-teal-500/25 bg-teal-500/5 shadow-[0_0_20px_rgba(45,212,191,0.15)]";

export default function HomeBaseModule() {
  const { scope, app_role } = useScope();
  const [rantingList, setRantingList] = useState<RantingRow[]>([]);
  const [rantingLoading, setRantingLoading] = useState(true);
  const [, setProvinsiList] = useState<ProvinsiOption[]>([]);
  const [cabangList, setCabangList] = useState<CabangOption[]>([]);
  /** Filter manual: daftar kabupaten/kota (regency) untuk search */
  const [wilayahOptions, setWilayahOptions] = useState<WilayahOption[]>([]);
  const [wilayahSearch, setWilayahSearch] = useState("");
  const [selectedRegencyId, setSelectedRegencyId] = useState<string | null>(
    null,
  );
  const [selectedRegencyName, setSelectedRegencyName] = useState<string | null>(
    null,
  );
  const [selectedRanting, setSelectedRanting] = useState<RantingRow | null>(
    null,
  );
  const [rantingSearch, setRantingSearch] = useState("");
  const [rantingModalOpen, setRantingModalOpen] = useState(false);
  const [rantingFormMode, setRantingFormMode] = useState<"edit" | "create">(
    "edit",
  );
  const [rantingForm, setRantingForm] = useState<{
    nama: string;
    aktif: boolean;
    cabang_id: string;
    province_id: string;
    regency_id: string;
    district_id: string;
    instagram_url: string;
    alamat: string;
    ketua_nama: string;
    sekretaris_nama: string;
    bendahara_nama: string;
    pelatih_nama: string;
  }>({
    nama: "",
    aktif: true,
    cabang_id: "",
    province_id: "",
    regency_id: "",
    district_id: "",
    instagram_url: "",
    alamat: "",
    ketua_nama: "",
    sekretaris_nama: "",
    bendahara_nama: "",
    pelatih_nama: "",
  });
  const [rantingFormError, setRantingFormError] = useState<string | null>(null);
  const [rantingFormSaving, setRantingFormSaving] = useState(false);

  const loadRanting = useCallback(() => {
    return fetch("/api/ranting", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) return [];
        try {
          const text = await res.text();
          return text.trim() ? (JSON.parse(text) as RantingRow[]) : [];
        } catch {
          return [];
        }
      })
      .then((data: RantingRow[]) => {
        if (Array.isArray(data)) setRantingList(data);
        return data;
      })
      .catch(() => []);
  }, []);

  const handleRantingFormSubmit = useCallback(() => {
    const nama = rantingForm.nama.trim();
    if (!nama) {
      setRantingFormError("Nama ranting wajib diisi.");
      return;
    }
    setRantingFormError(null);
    setRantingFormSaving(true);
    const base = {
      nama,
      aktif: rantingForm.aktif,
      cabang_id: rantingForm.cabang_id || null,
      province_id: rantingForm.province_id
        ? parseInt(rantingForm.province_id, 10)
        : null,
      regency_id: rantingForm.regency_id
        ? parseInt(rantingForm.regency_id, 10)
        : null,
      district_id: rantingForm.district_id
        ? parseInt(rantingForm.district_id, 10)
        : null,
      instagram_url: rantingForm.instagram_url.trim() || null,
    };

    const isEdit = rantingFormMode === "edit" && selectedRanting;
    const url = "/api/ranting";
    const method = isEdit ? "PATCH" : "POST";
    const body = isEdit ? { id: selectedRanting!.id, ...base } : base;

    fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error((data?.message as string) || "Gagal menyimpan.");
        }
      })
      .then(() => {
        loadRanting();
        setRantingModalOpen(false);
        if (isEdit) {
          setSelectedRanting((prev) =>
            prev
              ? {
                  ...prev,
                  ...base,
                }
              : null,
          );
        } else {
          setSelectedRanting(null);
        }
      })
      .catch((err: Error) => {
        setRantingFormError(err.message || "Gagal menyimpan.");
      })
      .finally(() => {
        setRantingFormSaving(false);
      });
  }, [rantingForm, rantingFormMode, selectedRanting, loadRanting]);

  // Demo data kwitansi; nanti bisa diganti hasil fetch dari API pembayaran
  const [payments] = useState<PaymentRow[]>([
    {
      id: "kw-001",
      nama: "Budi Santoso",
      jenis: "Event",
      event: "Kejuaraan Kota Surabaya 2026",
      nominal: 250_000,
      tanggal: new Date().toISOString(),
    },
    {
      id: "kw-002",
      nama: "Siti Aminah",
      jenis: "Ujian Kyu",
      event: "Ujian Kyu Periode Maret",
      nominal: 150_000,
      tanggal: new Date().toISOString(),
    },
  ]);

  // Load ranting (dibatasi scope dari API)
  useEffect(() => {
    let cancelled = false;
    loadRanting().finally(() => {
      if (!cancelled) setRantingLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [loadRanting]);

  // Load provinsi + cabang sesuai scope (PP melihat semua)
  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetch("/api/provinsi", { credentials: "include" }),
      fetch("/api/cabang", { credentials: "include" }),
    ])
      .then(async ([provRes, cabRes]) => {
        let prov: ProvinsiOption[] = [];
        let cab: CabangOption[] = [];

        if (provRes.ok) {
          try {
            const t = await provRes.text();
            prov = t.trim()
              ? (JSON.parse(t) as { id: string; nama: string }[])
              : [];
          } catch {
            prov = [];
          }
        }

        if (cabRes.ok) {
          try {
            const t = await cabRes.text();
            cab = t.trim()
              ? (JSON.parse(t) as {
                  id: string;
                  nama: string;
                  provinsi_id: string;
                  aktif: boolean;
                }[])
              : [];
          } catch {
            cab = [];
          }
        }

        if (!cancelled) {
          setProvinsiList(prov);
          setCabangList(cab);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProvinsiList([]);
          setCabangList([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Load kabupaten/kota (regencies) untuk filter manual — berdasarkan province_id di ranting
  useEffect(() => {
    let cancelled = false;
    const provinceIds = Array.from(
      new Set(
        rantingList
          .map((r) => r.province_id)
          .filter((id): id is number => id != null),
      ),
    );

    if (provinceIds.length === 0) {
      Promise.resolve().then(() => {
        if (!cancelled) setWilayahOptions([]);
      });
      return () => {
        cancelled = true;
      };
    }

    const load = async () => {
      const all: WilayahOption[] = [];
      for (const pid of provinceIds) {
        try {
          const res = await fetch(
            `/api/wilayah/regencies?provinceId=${encodeURIComponent(String(pid))}`,
          );
          if (!res.ok) continue;
          const data = await res.json();
          const arr = Array.isArray(data) ? data : [];
          for (const r of arr) {
            const id = String(
              (r as { id?: string }).id ?? (r as { code?: string }).code ?? "",
            );
            const name =
              (r as { name?: string }).name ??
              (r as { nama?: string }).nama ??
              id;
            if (id) all.push({ id, name });
          }
        } catch {
          // skip province
        }
      }
      if (!cancelled) setWilayahOptions(all);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [rantingList]);

  const wilayahLabel = useMemo(() => {
    if (!scope) return "Wilayah belum ter-set";
    if (scope.is_pp) return "PP — seluruh Indonesia";
    if (scope.cabang_ids.length > 0) return "Cabang";
    if (scope.ranting_ids.length > 0) return "Ranting";
    if (scope.provinsi_ids.length > 0) return "Pengprov";
    return "Wilayah";
  }, [scope]);

  /** Opsi kabupaten/kota yang cocok dengan search (untuk dropdown) */
  const filteredWilayahOptions = useMemo(() => {
    const q = wilayahSearch.trim().toLowerCase();
    if (!q) return wilayahOptions.slice(0, 50);
    return wilayahOptions
      .filter((w) => w.name.toLowerCase().includes(q))
      .slice(0, 50);
  }, [wilayahOptions, wilayahSearch]);

  /** Ranting yang masuk filter: by kabupaten/kota (regency) yang dipilih */
  const filteredRanting = useMemo(() => {
    if (!selectedRegencyId) return rantingList;
    return rantingList.filter(
      (r) => String(r.regency_id ?? "") === String(selectedRegencyId),
    );
  }, [rantingList, selectedRegencyId]);

  /** Satu baris per cabang (per kabupaten/kota) untuk tabel atas */
  const cabangRows = useMemo(() => {
    const map = new Map<
      string,
      {
        displayName: string;
        isActive: boolean;
        representative: RantingRow;
      }
    >();

    filteredRanting.forEach((r) => {
      const key = String(r.regency_id ?? r.cabang_id ?? r.id);
      if (!key) return;

      const cabangName = cabangList.find((c) => c.id === r.cabang_id)?.nama;
      const namaKabupaten = wilayahOptions.find(
        (w) => w.id === String(r.regency_id ?? ""),
      )?.name;
      const cabangDisplay = cabangName ?? namaKabupaten ?? "—";

      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          displayName: cabangDisplay,
          isActive: r.aktif,
          representative: r,
        });
      } else if (r.aktif && !existing.isActive) {
        existing.isActive = true;
      }
    });

    return Array.from(map.values());
  }, [filteredRanting, cabangList, wilayahOptions]);

  /** Ranting di panel (cabang terpilih) + search nama ranting */
  const panelRanting = useMemo(() => {
    if (!selectedRanting) return [] as RantingRow[];
    const base = rantingList.filter(
      (r) =>
        String(r.regency_id ?? "") === String(selectedRanting.regency_id ?? ""),
    );
    const q = rantingSearch.trim().toLowerCase();
    if (!q) return base;
    return base.filter((r) => r.nama.toLowerCase().includes(q));
  }, [rantingList, selectedRanting, rantingSearch]);

  /** Nama cabang yang aktif di form (untuk modal tambah/ubah) */
  const currentCabangName = useMemo(() => {
    const cabangName = cabangList.find(
      (c) => c.id === rantingForm.cabang_id,
    )?.nama;
    const namaKabupaten = wilayahOptions.find(
      (w) => w.id === String(rantingForm.regency_id || selectedRegencyId || ""),
    )?.name;
    return cabangName ?? namaKabupaten ?? selectedRegencyName ?? "—";
  }, [
    cabangList,
    wilayahOptions,
    rantingForm.cabang_id,
    rantingForm.regency_id,
    selectedRegencyId,
    selectedRegencyName,
  ]);

  const totalRanting = rantingList.length;
  const totalRantingAktif = rantingList.filter((r) => r.aktif).length;

  const isSuperadmin = (app_role ?? "").toUpperCase() === "SUPERADMIN";

  return (
    <div className="space-y-8 pb-8">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-wide">
            Home Base
          </h1>
          <p className="text-sm text-white/60 mt-1">
            Ringkasan wilayah, ranting, keanggotaan, event, dan kwitansi di
            wilayah Anda.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-teal-300 bg-teal-500/10 border border-teal-400/30 px-3 py-1.5 rounded-full">
          <MapPin size={14} />
          <span>{wilayahLabel}</span>
          {isSuperadmin && (
            <span className="ml-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300 border border-emerald-400/40">
              Superadmin
            </span>
          )}
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={accentCard}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/60">Ranting Aktif</span>
            <UserCheck size={16} className="text-teal-300" />
          </div>
          <div className="mt-2 text-2xl font-bold text-teal-300">
            {rantingLoading ? "…" : totalRantingAktif}
          </div>
          <div className="text-[11px] text-white/50 mt-1">
            Dari total {rantingLoading ? "…" : totalRanting} ranting di wilayah
            yang Anda kelola.
          </div>
        </div>

        <div className={accentCard.replace("teal", "emerald")}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/60">Anggota</span>
            <Users size={16} className="text-emerald-300" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-300">—</div>
          <div className="text-[11px] text-white/50 mt-1">
            Integrasi ke modul Keanggotaan; angka ini bisa diisi dari API
            keanggotaan per wilayah.
          </div>
        </div>

        <div className={accentCard.replace("teal", "amber")}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/60">Event & Ujian</span>
            <Trophy size={16} className="text-amber-300" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-300">—</div>
          <div className="text-[11px] text-white/50 mt-1">
            Ringkasan event/ujian yang terkait dengan ranting/cabang Anda.
          </div>
        </div>

        <div className={accentCard.replace("teal", "slate")}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/60">Kwitansi Bulan Ini</span>
            <CreditCard size={16} className="text-slate-300" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-200">
            {payments.length}
          </div>
          <div className="text-[11px] text-white/50 mt-1">
            Jumlah kwitansi yang siap dicetak (contoh data demo).
          </div>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: RANTING + KEANGGOTAAN */}
        <div className="lg:col-span-2 space-y-6">
          {/* RANTING */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Building2 size={18} className="text-teal-300" />
                <h2 className="text-sm font-medium text-white/90">
                  Cabang per kabupaten/kota
                </h2>
              </div>
              {/* Filter manual: search kabupaten/kota (Kota Surabaya, Sidoarjo, Gresik, dll) */}
              <div className="relative">
                <input
                  type="text"
                  value={wilayahSearch}
                  onChange={(e) => {
                    const v = e.target.value;
                    setWilayahSearch(v);
                    if (selectedRegencyId && v !== selectedRegencyName) {
                      setSelectedRegencyId(null);
                      setSelectedRegencyName(null);
                    }
                  }}
                  placeholder="Cari kabupaten/kota (misal: Kota Surabaya, Sidoarjo, Gresik, Mojokerto)"
                  className={`w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-xs text-white placeholder:text-white/40 focus:border-teal-500/50 focus:outline-none ${selectedRegencyId ? "pr-20" : ""}`}
                />
                {selectedRegencyId && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRegencyId(null);
                      setSelectedRegencyName(null);
                      setWilayahSearch("");
                      setSelectedRanting(null);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-teal-300 hover:text-teal-200"
                  >
                    Hapus filter
                  </button>
                )}
                {filteredWilayahOptions.length > 0 &&
                  wilayahSearch.trim() &&
                  !selectedRegencyId && (
                    <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-white/15 bg-[#0f172a] py-1 text-xs shadow-lg">
                      {filteredWilayahOptions.map((w) => (
                        <li key={w.id}>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-white/90 hover:bg-white/10"
                            onClick={() => {
                              setSelectedRegencyId(w.id);
                              setSelectedRegencyName(w.name);
                              setWilayahSearch(w.name);
                              setSelectedRanting(null);
                            }}
                          >
                            {w.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
              </div>
              {selectedRegencyName && (
                <p className="text-[11px] text-teal-300">
                  Menampilkan ranting di: <strong>{selectedRegencyName}</strong>
                </p>
              )}
            </div>
            {rantingLoading ? (
              <p className="text-xs text-white/50">Memuat data ranting…</p>
            ) : filteredRanting.length === 0 ? (
              <p className="text-xs text-white/50">
                {selectedRegencyId
                  ? "Cabang ini belum memiliki ranting."
                  : "Pilih kabupaten/kota di atas atau tampilkan semua ranting di bawah."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-white/60 border-b border-white/10">
                      <th className="pb-2 pr-4">Cabang</th>
                      <th className="pb-2 pr-4">Status</th>
                      <th className="pb-2">Instagram</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cabangRows.map((row) => (
                      <tr
                        key={row.representative.id}
                        className={`border-b border-white/5 last:border-0 cursor-pointer hover:bg-white/[0.06] ${
                          selectedRanting &&
                          String(selectedRanting.regency_id ?? "") ===
                            String(row.representative.regency_id ?? "")
                            ? "bg-white/[0.06]"
                            : "bg-transparent"
                        }`}
                        onClick={() => setSelectedRanting(row.representative)}
                      >
                        <td className="py-2 pr-4 text-white/90">
                          {row.displayName}
                        </td>
                        <td className="py-2 pr-4">
                          <span
                            className={
                              row.isActive
                                ? "text-emerald-400"
                                : "text-white/40 italic"
                            }
                          >
                            {row.isActive ? "Aktif" : "Nonaktif"}
                          </span>
                        </td>
                        <td className="py-2 text-white/60">—</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {selectedRanting && (
              <div className="mt-4 rounded-lg border border-teal-500/30 bg-teal-500/5 p-4 text-xs text-white/80 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-teal-200">
                        Ranting di cabang ini
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setRantingFormMode("create");
                          setRantingForm({
                            nama: "",
                            aktif: true,
                            cabang_id: String(selectedRanting.cabang_id ?? ""),
                            province_id: String(
                              selectedRanting.province_id ?? "",
                            ),
                            regency_id: String(
                              selectedRanting.regency_id ?? "",
                            ),
                            district_id: "",
                            instagram_url: "",
                            alamat: "",
                            ketua_nama: "",
                            sekretaris_nama: "",
                            bendahara_nama: "",
                            pelatih_nama: "",
                          });
                          setRantingFormError(null);
                          setRantingModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 rounded-full border border-teal-500/40 px-2 py-1 text-[10px] text-teal-200 hover:bg-teal-500/10"
                      >
                        <PlusCircle size={11} />
                        Tambah ranting
                      </button>
                    </div>
                    <div className="text-[11px] text-white/60">
                      Cabang:{" "}
                      <span className="font-medium text-teal-100">
                        {panelRanting.length > 0
                          ? (panelRanting[0]?.regency_id ?? "—")
                          : (selectedRegencyName ?? "—")}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedRanting(null)}
                    className="text-[10px] text-white/60 hover:text-white/90"
                  >
                    Tutup
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={rantingSearch}
                    onChange={(e) => setRantingSearch(e.target.value)}
                    placeholder="Cari ranting di cabang ini…"
                    className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1.5 text-[11px] text-white placeholder:text-white/40 focus:border-teal-400/70 focus:outline-none"
                  />
                  <div className="text-[11px] text-white/50 whitespace-nowrap">
                    {panelRanting.length} ranting
                  </div>
                </div>

                {panelRanting.length === 0 ? (
                  <p className="text-[11px] text-white/60">
                    Cabang ini belum memiliki ranting.
                  </p>
                ) : (
                  <div className="border border-teal-500/30 rounded-md overflow-hidden">
                    <table className="w-full text-[11px]">
                      <thead className="bg-teal-500/10 text-teal-100">
                        <tr>
                          <th className="px-2 py-1.5 text-left">
                            Nama ranting
                          </th>
                          <th className="px-2 py-1.5 text-left w-20">Status</th>
                          <th className="px-2 py-1.5 text-right w-20">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {panelRanting.map((r) => (
                          <tr
                            key={r.id}
                            className="border-t border-teal-500/20 hover:bg-teal-500/5"
                          >
                            <td className="px-2 py-1.5 text-white/90">
                              {r.nama}
                            </td>
                            <td className="px-2 py-1.5">
                              <span
                                className={
                                  r.aktif
                                    ? "text-emerald-300"
                                    : "text-white/45 italic"
                                }
                              >
                                {r.aktif ? "Aktif" : "Nonaktif"}
                              </span>
                            </td>
                            <td className="px-2 py-1.5 text-right space-x-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRanting(r);
                                  setRantingFormMode("edit");
                                  setRantingForm({
                                    nama: r.nama ?? "",
                                    aktif: r.aktif ?? true,
                                    cabang_id: String(r.cabang_id ?? ""),
                                    province_id: String(r.province_id ?? ""),
                                    regency_id: String(r.regency_id ?? ""),
                                    district_id: String(r.district_id ?? ""),
                                    instagram_url: r.instagram_url ?? "",
                                    alamat: "",
                                    ketua_nama: "",
                                    sekretaris_nama: "",
                                    bendahara_nama: "",
                                    pelatih_nama: "",
                                  });
                                  setRantingFormError(null);
                                  setRantingModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 rounded-full border border-teal-500/50 px-2 py-0.5 text-[10px] text-teal-200 hover:bg-teal-500/10"
                                title="Lihat detail & ubah"
                              >
                                <Info size={10} />
                                Detail & Ubah
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  const ok = window.confirm(
                                    `Hapus ranting \"${r.nama}\"?`,
                                  );
                                  if (!ok) return;
                                  try {
                                    const res = await fetch(
                                      `/api/ranting?id=${encodeURIComponent(
                                        r.id,
                                      )}`,
                                      {
                                        method: "DELETE",
                                        credentials: "include",
                                      },
                                    );
                                    if (!res.ok) {
                                      console.error(
                                        "[HomeBase] Gagal hapus ranting",
                                        await res.text(),
                                      );
                                      return;
                                    }
                                    setRantingList((prev) =>
                                      prev.filter((x) => x.id !== r.id),
                                    );
                                    if (selectedRanting.id === r.id) {
                                      setSelectedRanting(null);
                                    }
                                  } catch (e) {
                                    console.error(
                                      "[HomeBase] Error hapus ranting",
                                      e,
                                    );
                                  }
                                }}
                                className="inline-flex items-center gap-1 rounded-full border border-red-500/60 px-2 py-0.5 text-[10px] text-red-300 hover:bg-red-500/10"
                              >
                                <Trash2 size={10} />
                                Hapus
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* KEANGGOTAAN (RINGKAS) */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
            <div className="flex items-center gap-2">
              <UserCheck size={18} className="text-emerald-300" />
              <h2 className="text-sm font-medium text-white/90">Keanggotaan</h2>
            </div>
            <p className="text-xs text-white/55">
              Ringkasan anggota di ranting/cabang Anda. Detail lengkap ada di
              menu Keanggotaan.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                <div className="text-emerald-300 font-semibold text-lg">—</div>
                <div className="text-white/60 mt-1">Anggota aktif</div>
              </div>
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                <div className="text-emerald-300 font-semibold text-lg">—</div>
                <div className="text-white/60 mt-1">Kyu / Dan tercatat</div>
              </div>
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                <div className="text-emerald-300 font-semibold text-lg">—</div>
                <div className="text-white/60 mt-1">Pelatihan diikuti</div>
              </div>
            </div>
            <a
              href="/dashboard/keanggotaan"
              className="inline-flex items-center gap-1.5 text-xs text-emerald-300 hover:text-emerald-200 no-underline"
            >
              Buka modul Keanggotaan →
            </a>
          </div>
        </div>

        {/* RIGHT: EVENT + KWITANSI */}
        <div className="space-y-6">
          {/* EVENT & UJIAN (PLACEHOLDER RINGKAS) */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Trophy size={18} className="text-amber-300" />
              <h2 className="text-sm font-medium text-white/90">
                Event & Ujian
              </h2>
            </div>
            <p className="text-xs text-white/55">
              Daftar event & ujian di wilayah Anda. Integrasi dapat diarahkan ke
              modul Event.
            </p>
            <p className="text-xs text-white/40 italic">
              (Placeholder) Belum terhubung ke tabel event. Data bisa diisi dari
              API event per wilayah.
            </p>
          </div>

          {/* KWITANSI PEMBAYARAN – RINGKASAN UNTUK HOME BASE */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <CreditCard size={18} className="text-teal-300" />
                  <h2 className="text-sm font-medium text-white/90">
                    Kwitansi Pembayaran
                  </h2>
                </div>
                <p className="text-xs text-white/55">
                  Ringkasan aktivitas pembayaran di wilayah Anda. Detail lengkap
                  dan cetak kwitansi ada di modul Keuangan.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-white/70">
              <div>
                <div className="text-[11px] text-white/50">
                  Contoh data demo — nantinya bisa diisi dari tabel pembayaran.
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wide text-white/40">
                  Total demo kwitansi
                </div>
                <div className="text-lg font-semibold text-slate-100">
                  {payments.length}
                </div>
              </div>
            </div>
            <a
              href="/dashboard/keuangan"
              className="inline-flex items-center gap-1.5 text-xs text-teal-300 hover:text-teal-200 no-underline"
            >
              Buka modul Keuangan untuk kelola kwitansi →
            </a>
          </div>
        </div>
      </div>

      {/* Modal tambah / ubah ranting */}
      {rantingModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60"
          onClick={() => !rantingFormSaving && setRantingModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="ranting-modal-title"
        >
          <div
            className="w-full max-w-md max-h-[90vh] sm:max-h-[85vh] rounded-t-xl sm:rounded-xl border border-teal-500/30 bg-[#0f172a] shadow-xl text-white flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 flex-shrink-0">
              <h2
                id="ranting-modal-title"
                className="text-sm font-semibold text-teal-200"
              >
                {rantingFormMode === "edit"
                  ? "Detail & ubah ranting"
                  : "Tambah ranting baru"}
              </h2>
              <button
                type="button"
                onClick={() => !rantingFormSaving && setRantingModalOpen(false)}
                className="text-white/60 hover:text-white/90 text-lg leading-none"
                aria-label="Tutup"
              >
                ×
              </button>
            </div>
            <form
              className="p-4 sm:p-6 space-y-3 overflow-y-auto flex-1 min-h-0 overscroll-contain"
              style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
              onSubmit={(e) => {
                e.preventDefault();
                handleRantingFormSubmit();
              }}
            >
              {rantingFormError && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                  {rantingFormError}
                </p>
              )}
              {rantingFormMode === "edit" && selectedRanting && (
                <div className="rounded-lg border border-teal-500/30 bg-teal-500/10 px-3 py-2 text-[11px] text-white/85 space-y-1">
                  <div className="font-medium text-teal-200 mb-1">
                    Ringkasan ranting (lihat & edit di bawah)
                  </div>
                  <div>
                    <span className="text-white/60">Status: </span>
                    <span
                      className={
                        selectedRanting.aktif
                          ? "text-emerald-300"
                          : "text-white/50 italic"
                      }
                    >
                      {selectedRanting.aktif ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                  <div>
                    Wilayah: Provinsi ID {selectedRanting.province_id ?? "—"}
                    , Kab/Kota ID {selectedRanting.regency_id ?? "—"}, Kec ID{" "}
                    {selectedRanting.district_id ?? "—"}
                  </div>
                  <div>
                    <span className="text-white/60">Instagram: </span>
                    {selectedRanting.instagram_url || "—"}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs text-white/70 mb-1">
                  Nama ranting
                </label>
                <input
                  type="text"
                  value={rantingForm.nama}
                  onChange={(e) =>
                    setRantingForm((f) => ({ ...f, nama: e.target.value }))
                  }
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-teal-500/60 focus:outline-none"
                  placeholder="Nama ranting"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ranting-aktif"
                  checked={rantingForm.aktif}
                  onChange={(e) =>
                    setRantingForm((f) => ({ ...f, aktif: e.target.checked }))
                  }
                  className="rounded border-white/30 text-teal-500 focus:ring-teal-500/50"
                />
                <label
                  htmlFor="ranting-aktif"
                  className="text-xs text-white/80"
                >
                  Aktif
                </label>
              </div>
              <div>
                <label className="block text-xs text-white/70 mb-1">
                  Cabang
                </label>
                <div className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white/85">
                  {currentCabangName}
                </div>
              </div>
              <div>
                <label className="block text-xs text-white/70 mb-1">
                  Alamat ranting
                </label>
                <textarea
                  value={rantingForm.alamat}
                  onChange={(e) =>
                    setRantingForm((f) => ({ ...f, alamat: e.target.value }))
                  }
                  className="w-full min-h-[110px] rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-white/40 focus:border-teal-500/60 focus:outline-none resize-y"
                  placeholder={`1. Alamat dojo utama, ${currentCabangName}\n2. Catatan akses lokasi...\n3. ...`}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-white/70 mb-1">
                    Nama ketua ranting
                  </label>
                  <input
                    type="text"
                    value={rantingForm.ketua_nama}
                    onChange={(e) =>
                      setRantingForm((f) => ({
                        ...f,
                        ketua_nama: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-white/40 focus:border-teal-500/60 focus:outline-none"
                    placeholder="Nama ketua"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/70 mb-1">
                    Nama sekretaris ranting
                  </label>
                  <textarea
                    value={rantingForm.sekretaris_nama}
                    onChange={(e) =>
                      setRantingForm((f) => ({
                        ...f,
                        sekretaris_nama: e.target.value,
                      }))
                    }
                    className="w-full min-h-[80px] rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-white/40 focus:border-teal-500/60 focus:outline-none resize-y"
                    placeholder="Daftar nama sekretaris ranting..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/70 mb-1">
                    Nama bendahara ranting
                  </label>
                  <textarea
                    value={rantingForm.bendahara_nama}
                    onChange={(e) =>
                      setRantingForm((f) => ({
                        ...f,
                        bendahara_nama: e.target.value,
                      }))
                    }
                    className="w-full min-h-[80px] rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-white/40 focus:border-teal-500/60 focus:outline-none resize-y"
                    placeholder="Daftar nama bendahara ranting..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/70 mb-1">
                    Nama pelatih ranting
                  </label>
                  <textarea
                    value={rantingForm.pelatih_nama}
                    onChange={(e) =>
                      setRantingForm((f) => ({
                        ...f,
                        pelatih_nama: e.target.value,
                      }))
                    }
                    className="w-full min-h-[80px] rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-white/40 focus:border-teal-500/60 focus:outline-none resize-y"
                    placeholder="Daftar nama pelatih ranting..."
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-white/70 mb-1">
                  Instagram URL
                </label>
                <input
                  type="url"
                  value={rantingForm.instagram_url}
                  onChange={(e) =>
                    setRantingForm((f) => ({
                      ...f,
                      instagram_url: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-teal-500/60 focus:outline-none"
                  placeholder="https://instagram.com/..."
                />
              </div>
              <div className="flex gap-2 pt-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    !rantingFormSaving && setRantingModalOpen(false)
                  }
                  className="flex-1 min-h-[44px] rounded-lg border border-white/20 px-3 py-2.5 text-xs sm:text-sm text-white/80 hover:bg-white/5"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={rantingFormSaving}
                  className="flex-1 min-h-[44px] rounded-lg bg-teal-500/80 hover:bg-teal-500 text-white px-3 py-2.5 text-xs sm:text-sm font-medium disabled:opacity-50"
                >
                  {rantingFormSaving ? "Menyimpan…" : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
