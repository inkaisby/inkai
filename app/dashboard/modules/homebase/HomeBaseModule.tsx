"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Users,
  UserCheck,
  Trophy,
  CreditCard,
  MapPin,
  FileText,
  Printer,
  Building2,
} from "lucide-react";
import jsPDF from "jspdf";

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
  const [provinsiList, setProvinsiList] = useState<ProvinsiOption[]>([]);
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
  const [rantingModalOpen, setRantingModalOpen] = useState(false);
  const [rantingForm, setRantingForm] = useState<{
    nama: string;
    aktif: boolean;
    cabang_id: string;
    province_id: string;
    regency_id: string;
    district_id: string;
    instagram_url: string;
  }>({
    nama: "",
    aktif: true,
    cabang_id: "",
    province_id: "",
    regency_id: "",
    district_id: "",
    instagram_url: "",
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
    if (!selectedRanting) return;
    const nama = rantingForm.nama.trim();
    if (!nama) {
      setRantingFormError("Nama ranting wajib diisi.");
      return;
    }
    setRantingFormError(null);
    setRantingFormSaving(true);
    const body = {
      id: selectedRanting.id,
      nama,
      aktif: rantingForm.aktif,
      cabang_id: rantingForm.cabang_id || null,
      province_id: rantingForm.province_id ? parseInt(rantingForm.province_id, 10) : null,
      regency_id: rantingForm.regency_id ? parseInt(rantingForm.regency_id, 10) : null,
      district_id: rantingForm.district_id ? parseInt(rantingForm.district_id, 10) : null,
      instagram_url: rantingForm.instagram_url.trim() || null,
    };
    fetch("/api/ranting", {
      method: "PATCH",
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
        setSelectedRanting((prev) =>
          prev
            ? {
                ...prev,
                nama: body.nama,
                aktif: body.aktif,
                cabang_id: body.cabang_id,
                province_id: body.province_id,
                regency_id: body.regency_id,
                district_id: body.district_id,
                instagram_url: body.instagram_url,
              }
            : null,
        );
      })
      .catch((err: Error) => {
        setRantingFormError(err.message || "Gagal menyimpan.");
      })
      .finally(() => {
        setRantingFormSaving(false);
      });
  }, [selectedRanting, rantingForm, loadRanting]);

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

  // Load kabupaten/kota (regencies) untuk filter manual — gabung dari semua provinsi
  useEffect(() => {
    let cancelled = false;
    if (provinsiList.length === 0) {
      Promise.resolve().then(() => {
        if (!cancelled) setWilayahOptions([]);
      });
      return () => {
        cancelled = true;
      };
    }
    const load = async () => {
      const all: WilayahOption[] = [];
      for (const p of provinsiList) {
        try {
          const res = await fetch(
            `/api/wilayah/regencies?provinceId=${encodeURIComponent(p.id)}`,
            { credentials: "include" },
          );
          if (!res.ok) continue;
          const data = await res.json();
          const arr = Array.isArray(data) ? data : [];
          for (const r of arr) {
            const id = String((r as { id?: string }).id ?? (r as { code?: string }).code ?? "");
            const name = (r as { name?: string }).name ?? (r as { nama?: string }).nama ?? id;
            if (id) all.push({ id, name });
          }
        } catch {
          // skip provinsi
        }
      }
      if (!cancelled) setWilayahOptions(all);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [provinsiList]);

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

  const totalRanting = rantingList.length;
  const totalRantingAktif = rantingList.filter((r) => r.aktif).length;

  const isSuperadmin = (app_role ?? "").toUpperCase() === "SUPERADMIN";

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(v);

  const handlePrintReceipt = (row: PaymentRow) => {
    const doc = new jsPDF();
    const marginX = 20;
    let y = 20;

    doc.setFontSize(14);
    doc.text("KWITANSI PEMBAYARAN", marginX, y);
    y += 8;

    doc.setFontSize(10);
    doc.text(`Nomor : ${row.id}`, marginX, y);
    y += 6;
    doc.text(
      `Tanggal : ${new Date(row.tanggal).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })}`,
      marginX,
      y,
    );
    y += 10;

    doc.text(`Sudah terima dari : ${row.nama}`, marginX, y);
    y += 6;
    doc.text(`Untuk pembayaran : ${row.jenis} - ${row.event}`, marginX, y);
    y += 6;
    doc.text(`Sejumlah : ${formatCurrency(row.nominal)}`, marginX, y);
    y += 10;

    doc.text("Petugas,", marginX + 120, y);
    y += 20;
    doc.text("__________________", marginX + 110, y);

    doc.save(`${row.id}-kwitansi.pdf`);
  };

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
                  Ranting per kabupaten/kota
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
                {filteredWilayahOptions.length > 0 && wilayahSearch.trim() && !selectedRegencyId && (
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
                  ? `Tidak ada ranting di ${selectedRegencyName ?? "wilayah ini"}.`
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
                    {filteredRanting.slice(0, 12).map((r) => {
                      const cabangName = cabangList.find(
                        (c) => c.id === r.cabang_id,
                      )?.nama;
                      // Nama cabang diambil dari nama kabupaten (regency_id = id_kabupaten)
                      const namaKabupaten = wilayahOptions.find(
                        (w) => w.id === String(r.regency_id ?? ""),
                      )?.name;
                      const cabangDisplay = cabangName ?? namaKabupaten ?? "—";
                      return (
                      <tr
                        key={r.id}
                        className={`border-b border-white/5 last:border-0 cursor-pointer hover:bg-white/[0.06] ${
                          selectedRanting?.id === r.id
                            ? "bg-white/[0.06]"
                            : "bg-transparent"
                        }`}
                        onClick={() => setSelectedRanting(r)}
                      >
                        <td className="py-2 pr-4 text-white/90">{cabangDisplay}</td>
                        <td className="py-2 pr-4">
                          <span
                            className={
                              r.aktif
                                ? "text-emerald-400"
                                : "text-white/40 italic"
                            }
                          >
                            {r.aktif ? "Aktif" : "Nonaktif"}
                          </span>
                        </td>
                        <td className="py-2 text-white/60">
                          {r.instagram_url ? (
                            <a
                              href={r.instagram_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-teal-300 hover:text-teal-200 underline-offset-2 hover:underline"
                            >
                              {r.instagram_url
                                .replace(/^https?:\/\//, "")
                                .slice(0, 30)}
                              …
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {selectedRanting && (
              <div className="mt-4 rounded-lg border border-teal-500/30 bg-teal-500/5 p-4 text-xs text-white/80 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-teal-200">
                    Detail Ranting: {selectedRanting.nama}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedRanting(null)}
                    className="text-[10px] text-white/60 hover:text-white/90"
                  >
                    Tutup
                  </button>
                </div>
                <div>Aktif: {selectedRanting.aktif ? "Ya" : "Tidak"}</div>
                <div>
                  Wilayah: Provinsi ID{" "}
                  {selectedRanting.province_id ?? "—"}, Kab/Kota ID{" "}
                  {selectedRanting.regency_id ?? "—"}, Kec ID{" "}
                  {selectedRanting.district_id ?? "—"}
                </div>
                <div>
                  Instagram:{" "}
                  {selectedRanting.instagram_url
                    ? selectedRanting.instagram_url
                    : "—"}
                </div>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedRanting) return;
                      setRantingForm({
                        nama: selectedRanting.nama ?? "",
                        aktif: selectedRanting.aktif ?? true,
                        cabang_id: String(selectedRanting.cabang_id ?? ""),
                        province_id: String(selectedRanting.province_id ?? ""),
                        regency_id: String(selectedRanting.regency_id ?? ""),
                        district_id: String(selectedRanting.district_id ?? ""),
                        instagram_url: selectedRanting.instagram_url ?? "",
                      });
                      setRantingFormError(null);
                      setRantingModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] text-teal-300 hover:text-teal-200 no-underline bg-transparent border-0 cursor-pointer p-0"
                  >
                    Ubah detail ranting →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* KEANGGOTAAN (RINGKAS) */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
            <div className="flex items-center gap-2">
              <UserCheck size={18} className="text-emerald-300" />
              <h2 className="text-sm font-medium text-white/90">
                Keanggotaan
              </h2>
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

          {/* KWITANSI PEMBAYARAN */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-teal-300" />
                <h2 className="text-sm font-medium text-white/90">
                  Kwitansi Pembayaran
                </h2>
              </div>
            </div>
            <p className="text-xs text-white/55">
              Cetak kwitansi pembayaran event, ujian, atau iuran. Saat ini
              memakai contoh data; nanti bisa dihubungkan ke tabel pembayaran.
            </p>
            <div className="border border-white/10 rounded-lg overflow-hidden">
              <table className="w-full text-[11px]">
                <thead className="bg-white/5">
                  <tr className="text-white/60">
                    <th className="px-3 py-2 text-left w-24">Tanggal</th>
                    <th className="px-3 py-2 text-left">Nama</th>
                    <th className="px-3 py-2 text-left">Jenis</th>
                    <th className="px-3 py-2 text-right w-24">Nominal</th>
                    <th className="px-3 py-2 text-right w-20">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr
                      key={p.id}
                      className="border-t border-white/5 hover:bg-white/[0.04]"
                    >
                      <td className="px-3 py-2 text-white/60">
                        {new Date(p.tanggal).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-3 py-2 text-white/90">{p.nama}</td>
                      <td className="px-3 py-2 text-white/70">
                        {p.jenis} — {p.event}
                      </td>
                      <td className="px-3 py-2 text-right text-amber-300">
                        {formatCurrency(p.nominal)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => handlePrintReceipt(p)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-teal-500/60 text-teal-200 hover:bg-teal-500/10"
                        >
                          <Printer size={12} />
                          Cetak
                        </button>
                      </td>
                    </tr>
                  ))}
                  {payments.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-3 text-center text-white/50 text-xs"
                      >
                        Belum ada data pembayaran.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal ubah detail ranting */}
      {rantingModalOpen && selectedRanting && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => !rantingFormSaving && setRantingModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="ranting-modal-title"
        >
          <div
            className="w-full max-w-md rounded-xl border border-teal-500/30 bg-[#0f172a] shadow-xl text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <h2 id="ranting-modal-title" className="text-sm font-semibold text-teal-200">
                Ubah detail ranting
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
              className="p-4 space-y-3"
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
              <div>
                <label className="block text-xs text-white/70 mb-1">Nama ranting</label>
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
                <label htmlFor="ranting-aktif" className="text-xs text-white/80">
                  Aktif
                </label>
              </div>
              <div>
                <label className="block text-xs text-white/70 mb-1">Cabang</label>
                <select
                  value={rantingForm.cabang_id}
                  onChange={(e) =>
                    setRantingForm((f) => ({ ...f, cabang_id: e.target.value }))
                  }
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white focus:border-teal-500/60 focus:outline-none"
                >
                  <option value="">— Pilih cabang —</option>
                  {cabangList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nama}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-white/70 mb-1">Provinsi ID</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={rantingForm.province_id}
                    onChange={(e) =>
                      setRantingForm((f) => ({
                        ...f,
                        province_id: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-white/20 bg-white/5 px-2 py-1.5 text-xs text-white placeholder:text-white/40 focus:border-teal-500/60 focus:outline-none"
                    placeholder="ID"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/70 mb-1">Kab/Kota ID</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={rantingForm.regency_id}
                    onChange={(e) =>
                      setRantingForm((f) => ({
                        ...f,
                        regency_id: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-white/20 bg-white/5 px-2 py-1.5 text-xs text-white placeholder:text-white/40 focus:border-teal-500/60 focus:outline-none"
                    placeholder="ID"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/70 mb-1">Kec ID</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={rantingForm.district_id}
                    onChange={(e) =>
                      setRantingForm((f) => ({
                        ...f,
                        district_id: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-white/20 bg-white/5 px-2 py-1.5 text-xs text-white placeholder:text-white/40 focus:border-teal-500/60 focus:outline-none"
                    placeholder="ID"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-white/70 mb-1">Instagram URL</label>
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
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => !rantingFormSaving && setRantingModalOpen(false)}
                  className="flex-1 rounded-lg border border-white/20 px-3 py-2 text-xs text-white/80 hover:bg-white/5"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={rantingFormSaving}
                  className="flex-1 rounded-lg bg-teal-500/80 hover:bg-teal-500 text-white px-3 py-2 text-xs font-medium disabled:opacity-50"
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

