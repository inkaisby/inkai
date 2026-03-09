"use client";

import { useEffect, useState } from "react";
import { Lock, Pencil, Settings2, Unlock } from "lucide-react";
import { useScope } from "@/app/dashboard/components/topbar-premium/context/ScopeContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type CabangOption = { id: string; nama: string };
type TahunRow = {
  id: string;
  nama: string;
  tahun: number;
  periode: string;
  cabang_id: string | null;
  tanggal: string | null;
  tempat: string | null;
  ditutup_at: string | null;
  biaya_per_kyu?: Record<string, number> | null;
  qris_content?: string | null;
};

const KYU_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
const DAN_KEYS = ["dan_1", "dan_2", "dan_3"];

/** Template biaya per Kyu/Dan (Rp): isi satu klik. Bisa diedit setelah dipakai. */
const BIAYA_KYU_TEMPLATE: Record<string, string> = {
  "1": "345000",
  "2": "345000",
  "3": "345000",
  "4": "315000",
  "5": "315000",
  "6": "305000",
  "7": "295000",
  "8": "295000",
  "9": "285000",
  "10": "285000",
  dan_1: "0",
  dan_2: "0",
  dan_3: "0",
};

type UserScope = { is_pp: boolean; cabang_ids: string[] };

type EditTahunModalProps = {
  row: TahunRow;
  cabangList: CabangOption[];
  scope: UserScope | null;
  isSuperadmin: boolean;
  isCabang: boolean;
  onClose: () => void;
  onSave: (payload: {
    nama: string;
    tahun: number;
    periode: "I" | "II";
    cabang_id?: string | null;
    tanggal?: string | null;
    tempat?: string | null;
    biaya_per_kyu?: Record<string, number> | null;
  }) => void;
  saving: boolean;
  saveError: string | null;
};

function EditTahunModal({
  row,
  cabangList,
  scope,
  isSuperadmin,
  isCabang,
  onClose,
  onSave,
  saving,
  saveError,
}: EditTahunModalProps) {
  const [nama, setNama] = useState(row.nama);
  const [tahun, setTahun] = useState(String(row.tahun));
  const [periode, setPeriode] = useState<"I" | "II">((row.periode === "II" ? "II" : "I") as "I" | "II");
  const [cabangId, setCabangId] = useState(row.cabang_id ?? "");
  const [tanggal, setTanggal] = useState(row.tanggal ?? "");
  const [tempat, setTempat] = useState(row.tempat ?? "");
  const [biayaKyu, setBiayaKyu] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    [...KYU_KEYS, ...DAN_KEYS].forEach((k) => {
      o[k] = row.biaya_per_kyu?.[k] != null ? String(row.biaya_per_kyu![k]) : "";
    });
    return o;
  });
  const [err, setErr] = useState<string | null>(null);

  const isCabangRow = !!row.cabang_id;
  const showCabangFields = isCabangRow;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const yearNum = parseInt(tahun, 10);
    if (!nama.trim() || !Number.isInteger(yearNum)) {
      setErr("Nama dan tahun wajib diisi.");
      return;
    }
    if (showCabangFields && isCabangRow) {
      const cid = cabangId || scope?.cabang_ids?.[0];
      if (isCabang && !cid) {
        setErr("Pilih cabang.");
        return;
      }
      if (!tanggal.trim() || !tempat.trim()) {
        setErr("Tanggal dan tempat wajib untuk UKT cabang.");
        return;
      }
    }

    const biayaPerKyu: Record<string, number> = {};
    [...KYU_KEYS, ...DAN_KEYS].forEach((k) => {
      const v = biayaKyu[k]?.replace(/\s/g, "") ?? "";
      if (v) {
        const num = parseFloat(v.replace(/,/g, "."));
        if (!Number.isNaN(num) && num >= 0) biayaPerKyu[k] = num;
      }
    });

    onSave({
      nama: nama.trim(),
      tahun: yearNum,
      periode,
      cabang_id: showCabangFields && cabangId ? cabangId : null,
      tanggal: showCabangFields ? (tanggal.trim() || null) : null,
      tempat: showCabangFields ? (tempat.trim() || null) : null,
      biaya_per_kyu: Object.keys(biayaPerKyu).length > 0 ? biayaPerKyu : null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-white/10 bg-zinc-900 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-zinc-200">Edit tahun ajaran — {row.nama}</h3>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">Nama</label>
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="UKT I / 2026"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">Tahun</label>
              <input
                type="number"
                min={2020}
                max={2030}
                value={tahun}
                onChange={(e) => setTahun(e.target.value)}
                placeholder="2026"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">Periode</label>
              <Select value={periode} onValueChange={(v) => setPeriode(v as "I" | "II")}>
                <SelectTrigger className="w-full border-white/10 bg-white/5 text-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="I">I</SelectItem>
                  <SelectItem value="II">II</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {showCabangFields && (
            <>
              {(isSuperadmin || scope?.is_pp) && cabangList.length > 0 && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-400">Cabang</label>
                  <Select value={cabangId || undefined} onValueChange={setCabangId}>
                    <SelectTrigger className="w-full border-white/10 bg-white/5 text-zinc-200">
                      <SelectValue placeholder="Global (tanpa cabang)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Global</SelectItem>
                      {cabangList.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nama}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">Tanggal pelaksanaan</label>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">Tempat</label>
                <input
                  type="text"
                  value={tempat}
                  onChange={(e) => setTempat(e.target.value)}
                  placeholder="Contoh: Dispora Dojo Karate"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                />
              </div>
            </>
          )}

          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <label className="block text-xs font-medium text-zinc-400">Biaya sesuai Kyu (Rp) — opsional</label>
              <button
                type="button"
                onClick={() => setBiayaKyu({ ...BIAYA_KYU_TEMPLATE })}
                className="rounded border border-amber-500/30 px-2 py-1 text-xs font-medium text-amber-400/90 hover:bg-amber-500/10"
              >
                Gunakan template
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {KYU_KEYS.map((k) => (
                <div key={k}>
                  <label className="mb-0.5 block text-[10px] text-zinc-500">Kyu {k}</label>
                  <input
                    type="text"
                    value={biayaKyu[k] ?? ""}
                    onChange={(e) => setBiayaKyu((prev) => ({ ...prev, [k]: e.target.value }))}
                    placeholder="0"
                    className="w-full rounded border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-500"
                  />
                </div>
              ))}
              {DAN_KEYS.map((k) => (
                <div key={k}>
                  <label className="mb-0.5 block text-[10px] text-zinc-500">Dan {k.replace("dan_", "")}</label>
                  <input
                    type="text"
                    value={biayaKyu[k] ?? ""}
                    onChange={(e) => setBiayaKyu((prev) => ({ ...prev, [k]: e.target.value }))}
                    placeholder="0"
                    className="w-full rounded border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {(err || saveError) && (
            <p className="text-sm text-red-400">{err || saveError}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-400 hover:bg-white/5 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-amber-600/90 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
            >
              {saving ? "Menyimpan…" : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type Props = {
  onCreated?: () => void;
};

export default function KelolaUKTCabang({ onCreated }: Props) {
  const { scope, app_role } = useScope();
  const [cabangList, setCabangList] = useState<CabangOption[]>([]);
  const [tahunList, setTahunList] = useState<TahunRow[]>([]);
  const [nama, setNama] = useState("");
  const [tahun, setTahun] = useState("");
  const [periode, setPeriode] = useState<"I" | "II">("I");
  const [cabangId, setCabangId] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [tempat, setTempat] = useState("");
  const [biayaKyu, setBiayaKyu] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    [...KYU_KEYS, ...DAN_KEYS].forEach((k) => { o[k] = ""; });
    return o;
  });
  const [saving, setSaving] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [qrisModal, setQrisModal] = useState<{ id: string; nama: string; qris_content: string } | null>(null);
  const [qrisSaving, setQrisSaving] = useState(false);
  const [editModal, setEditModal] = useState<TahunRow | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const isSuperadmin = app_role === "SUPERADMIN";
  const isCabang = (scope?.cabang_ids?.length ?? 0) > 0 && !scope?.is_pp;
  const isPp = scope?.is_pp === true;
  const canManage = isSuperadmin || isCabang || isPp;

  const loadTahunList = () => {
    fetch("/api/ukt/tahun-ajaran", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setTahunList(Array.isArray(d) ? d : []))
      .catch(() => setTahunList([]));
  };

  useEffect(() => {
    if (!canManage) return;
    fetch("/api/cabang", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setCabangList(Array.isArray(d) ? d : []))
      .catch(() => setCabangList([]));
  }, [canManage]);

  useEffect(() => {
    if (!canManage) return;
    loadTahunList();
  }, [canManage]);

  useEffect(() => {
    if (isCabang && scope?.cabang_ids?.length === 1 && cabangList.length > 0) {
      const first = scope.cabang_ids[0];
      if (cabangList.some((c) => c.id === first)) setCabangId(first);
    }
  }, [isCabang, scope?.cabang_ids, cabangList]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const yearNum = parseInt(tahun, 10);
    if (!nama.trim() || !Number.isInteger(yearNum)) {
      setMessage({ type: "err", text: "Nama dan tahun wajib diisi." });
      return;
    }
    if (isCabang) {
      const cid = cabangId || scope?.cabang_ids?.[0];
      if (!cid) {
        setMessage({ type: "err", text: "Pilih cabang." });
        return;
      }
      if (!tanggal.trim() || !tempat.trim()) {
        setMessage({ type: "err", text: "Tanggal dan tempat wajib untuk UKT cabang." });
        return;
      }
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        nama: nama.trim(),
        tahun: yearNum,
        periode,
      };
      if (isCabang) {
        body.cabang_id = cabangId || scope?.cabang_ids?.[0];
        body.tanggal = tanggal.trim();
        body.tempat = tempat.trim();
      }
      const biayaPerKyu: Record<string, number> = {};
      [...KYU_KEYS, ...DAN_KEYS].forEach((k) => {
        const v = biayaKyu[k]?.replace(/\s/g, "") ?? "";
        if (v) {
          const num = parseFloat(v.replace(/,/g, "."));
          if (!Number.isNaN(num) && num >= 0) biayaPerKyu[k] = num;
        }
      });
      if (Object.keys(biayaPerKyu).length > 0) body.biaya_per_kyu = biayaPerKyu;
      const res = await fetch("/api/ukt/tahun-ajaran", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "err", text: (j.message as string) || "Gagal membuat UKT" });
        return;
      }
      setMessage({ type: "ok", text: "UKT berhasil dibuat." });
      setNama("");
      setTahun("");
      setTanggal("");
      setTempat("");
      setBiayaKyu(() => {
        const o: Record<string, string> = {};
        [...KYU_KEYS, ...DAN_KEYS].forEach((k) => { o[k] = ""; });
        return o;
      });
      loadTahunList();
      onCreated?.();
    } finally {
      setSaving(false);
    }
  };

  const canCloseTahun = (row: TahunRow) => {
    if (scope?.is_pp) return true;
    if (!row.cabang_id) return false;
    return scope?.cabang_ids?.includes(row.cabang_id) ?? false;
  };

  const canEditTahun = (row: TahunRow) => {
    if (isSuperadmin || scope?.is_pp) return true;
    if (!row.cabang_id) return false;
    return scope?.cabang_ids?.includes(row.cabang_id) ?? false;
  };

  const handleTutupTahun = async (id: string, tutup: boolean) => {
    setClosingId(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/ukt/tahun-ajaran/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ditutup_at: tutup ? new Date().toISOString() : null }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "err", text: (j.message as string) || "Gagal mengubah status tahun ajaran" });
        return;
      }
      setMessage({ type: "ok", text: tutup ? "Tahun ajaran ditutup. Tidak ada pendaftaran/daftar ulang." : "Tahun ajaran dibuka kembali." });
      loadTahunList();
    } finally {
      setClosingId(null);
    }
  };

  const handleOpenQrisModal = (row: TahunRow) => {
    setQrisModal({ id: row.id, nama: row.nama, qris_content: row.qris_content ?? "" });
  };

  const handleSaveQris = async () => {
    if (!qrisModal) return;
    setQrisSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/ukt/tahun-ajaran/${qrisModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ qris_content: qrisModal.qris_content.trim() || null }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "err", text: (j.message as string) || "Gagal menyimpan QRIS" });
        return;
      }
      setMessage({ type: "ok", text: "QRIS berhasil disimpan. Ranting dapat menampilkan QR untuk pembayaran." });
      setQrisModal(null);
      loadTahunList();
    } finally {
      setQrisSaving(false);
    }
  };

  const handleSaveEdit = async (payload: {
    nama: string;
    tahun: number;
    periode: "I" | "II";
    cabang_id?: string | null;
    tanggal?: string | null;
    tempat?: string | null;
    biaya_per_kyu?: Record<string, number> | null;
  }) => {
    if (!editModal) return;
    setEditSaving(true);
    setEditError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/ukt/tahun-ajaran/${editModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = (j.message as string) || "Gagal menyimpan perubahan";
        setEditError(msg);
        setMessage({ type: "err", text: msg });
        return;
      }
      setMessage({ type: "ok", text: "Tahun ajaran berhasil diperbarui." });
      setEditModal(null);
      loadTahunList();
    } finally {
      setEditSaving(false);
    }
  };

  if (!scope) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 shadow-sm">
        <p className="text-sm text-zinc-500">Memuat scope…</p>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 shadow-sm">
        <p className="text-sm text-zinc-500">
          Hanya PP atau Ketua Cabang yang dapat membuat UKT. Akses Anda tidak memiliki wewenang ini.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-2">
        <Settings2 className="h-5 w-5 text-amber-500/80" />
        <h2 className="text-lg font-semibold text-zinc-100">
          {isCabang ? "Buat UKT Cabang" : "Buat UKT Global"}
        </h2>
      </div>
      <p className="mb-6 text-sm text-zinc-500">
        {isCabang
          ? "Isi nama, tahun ajaran, tanggal, dan tempat pelaksanaan UKT untuk cabang Anda. Ranting di bawah cabang ini nanti bisa mendaftarkan anggotanya ke UKT ini."
          : "Buat tahun ajaran UKT global. Semua ranting dapat mendaftarkan anggotanya ke UKT ini."}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-400">Nama (contoh: UKT I / 2026)</label>
          <input
            type="text"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="UKT I / 2026"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">Tahun</label>
            <input
              type="number"
              min={2020}
              max={2030}
              value={tahun}
              onChange={(e) => setTahun(e.target.value)}
              placeholder="2026"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">Periode</label>
            <Select value={periode} onValueChange={(v) => setPeriode(v as "I" | "II")}>
              <SelectTrigger className="w-full border-white/10 bg-white/5 text-zinc-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="I">I</SelectItem>
                <SelectItem value="II">II</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isCabang && (
          <>
            {cabangList.length > 1 ? (
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">Cabang</label>
                <Select value={cabangId || undefined} onValueChange={setCabangId}>
                  <SelectTrigger className="w-full border-white/10 bg-white/5 text-zinc-200">
                    <SelectValue placeholder="Pilih cabang" />
                  </SelectTrigger>
                  <SelectContent>
                    {cabangList
                      .filter((c) => scope.cabang_ids?.includes(c.id))
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nama}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">Tanggal pelaksanaan</label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">Tempat</label>
              <input
                type="text"
                value={tempat}
                onChange={(e) => setTempat(e.target.value)}
                placeholder="Contoh: Dispora Dojo Karate"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
              />
            </div>
          </>
        )}

        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <label className="block text-xs font-medium text-zinc-400">Biaya sesuai Kyu (Rp) — opsional</label>
            <button
              type="button"
              onClick={() => setBiayaKyu({ ...BIAYA_KYU_TEMPLATE })}
              className="rounded border border-amber-500/30 px-2 py-1 text-xs font-medium text-amber-400/90 hover:bg-amber-500/10"
            >
              Gunakan template
            </button>
          </div>
          <p className="mb-2 text-xs text-zinc-500">Isi nominal per level; kosongkan jika tidak dipakai.</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {KYU_KEYS.map((k) => (
              <div key={k}>
                <label className="mb-0.5 block text-[10px] text-zinc-500">Kyu {k}</label>
                <input
                  type="text"
                  value={biayaKyu[k] ?? ""}
                  onChange={(e) => setBiayaKyu((prev) => ({ ...prev, [k]: e.target.value }))}
                  placeholder="0"
                  className="w-full rounded border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-500"
                />
              </div>
            ))}
            {DAN_KEYS.map((k) => (
              <div key={k}>
                <label className="mb-0.5 block text-[10px] text-zinc-500">Dan {k.replace("dan_", "")}</label>
                <input
                  type="text"
                  value={biayaKyu[k] ?? ""}
                  onChange={(e) => setBiayaKyu((prev) => ({ ...prev, [k]: e.target.value }))}
                  placeholder="0"
                  className="w-full rounded border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-500"
                />
              </div>
            ))}
          </div>
        </div>

        {message && (
          <p className={`text-sm ${message.type === "ok" ? "text-emerald-400" : "text-red-400"}`}>
            {message.text}
          </p>
        )}
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-amber-600/90 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
        >
          {saving ? "Menyimpan…" : isCabang ? "Buat UKT Cabang" : "Buat UKT Global"}
        </button>
      </form>

      <div className="mt-10 border-t border-white/10 pt-8">
        <h3 className="mb-3 text-sm font-semibold text-zinc-200">Tahun ajaran UKT — hubungkan dengan cabang</h3>
        <p className="mb-4 text-xs text-zinc-500">
          Jika tahun ajaran ditutup, tidak ada pendaftaran baru atau daftar ulang (peserta batal). Cabang/PP dapat menutup tahun ajaran untuk UKT cabang sendiri; PP dapat menutup UKT global.
        </p>
        {tahunList.length === 0 ? (
          <p className="text-sm text-zinc-500">Belum ada tahun ajaran UKT.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-left text-zinc-400">
                  <th className="px-4 py-3">Tahun ajaran</th>
                  <th className="px-4 py-3">Scope</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {tahunList.map((row) => {
                  const canClose = canCloseTahun(row);
                  const ditutup = !!row.ditutup_at;
                  return (
                    <tr key={row.id} className="border-b border-white/5">
                      <td className="px-4 py-3 text-zinc-200">{row.nama}</td>
                      <td className="px-4 py-3 text-zinc-400">{row.cabang_id ? "Cabang" : "Global"}</td>
                      <td className="px-4 py-3">
                        {ditutup ? (
                          <span className="inline-flex items-center gap-1 text-amber-400/90">
                            <Lock className="h-3.5 w-3.5" />
                            Ditutup {row.ditutup_at ? new Date(row.ditutup_at).toLocaleDateString("id-ID", { dateStyle: "short" }) : ""}
                          </span>
                        ) : (
                          <span className="text-emerald-400/90">Masih dibuka</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1">
                          {canEditTahun(row) && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditError(null);
                                setEditModal(row);
                              }}
                              className="inline-flex items-center gap-1 rounded border border-white/20 px-2 py-1 text-xs font-medium text-zinc-300 transition hover:bg-white/10"
                            >
                              <Pencil className="h-3 w-3" />
                              Edit
                            </button>
                          )}
                          {canClose && (
                            <>
                              <button
                                type="button"
                                disabled={closingId === row.id}
                                onClick={() => handleTutupTahun(row.id, !ditutup)}
                                className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium transition ${
                                  ditutup
                                    ? "border-emerald-500/30 text-emerald-400/90 hover:bg-emerald-500/10"
                                    : "border-amber-500/30 text-amber-400/90 hover:bg-amber-500/10"
                                } disabled:opacity-50`}
                              >
                                {closingId === row.id ? "…" : ditutup ? <><Unlock className="h-3 w-3" /> Buka kembali</> : <><Lock className="h-3 w-3" /> Tutup tahun ajaran</>}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenQrisModal(row)}
                                className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium transition border-white/20 text-zinc-300 hover:bg-white/10 ${row.qris_content ? "text-emerald-400/90" : ""}`}
                              >
                                {row.qris_content ? "Edit QRIS" : "Set QRIS"}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {qrisModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !qrisSaving && setQrisModal(null)}>
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-zinc-900 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-zinc-200">QRIS — {qrisModal.nama}</h3>
            <p className="mt-1 text-xs text-zinc-500">Isi payload/URL QRIS dari bank atau payment gateway. Ranting akan melihat QR untuk scan bayar.</p>
            <textarea
              value={qrisModal.qris_content}
              onChange={(e) => setQrisModal((m) => (m ? { ...m, qris_content: e.target.value } : null))}
              placeholder="Contoh: https://... atau string payload QRIS"
              rows={4}
              className="mt-3 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={qrisSaving}
                onClick={() => setQrisModal(null)}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-400 hover:bg-white/5 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={qrisSaving}
                onClick={handleSaveQris}
                className="rounded-lg bg-amber-600/90 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
              >
                {qrisSaving ? "Menyimpan…" : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editModal && (
        <EditTahunModal
          row={editModal}
          cabangList={cabangList}
          scope={scope}
          isSuperadmin={isSuperadmin}
          isCabang={isCabang}
          onClose={() => {
            if (!editSaving) {
              setEditModal(null);
              setEditError(null);
            }
          }}
          onSave={handleSaveEdit}
          saving={editSaving}
          saveError={editError}
        />
      )}
    </div>
  );
}
