"use client";

import { useState, useMemo, useEffect } from "react";
import { Anggota } from "../../types/Anggota";
import type { PrestasiRow } from "../../hooks/useMyKeanggotaan";

const MAX_SIZE = 1 * 1024 * 1024;
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
];

const KATEGORI_OPTIONS = [
  { value: "OPEN", label: "OPEN" },
  { value: "FESTIVAL", label: "FESTIVAL" },
];

const TINGKAT_OPTIONS = [
  { value: "", label: "— Pilih Tingkat —" },
  { value: "Nasional", label: "Nasional" },
  { value: "Provinsi", label: "Provinsi" },
  { value: "Kota", label: "Kota" },
];

type PrestasiForm = {
  kategori: string;
  namaKejuaraan: string;
  tahun: string;
  tingkat: string;
  kelasPertandingan: string;
  file?: File | null;
};

const EMPTY_FORM: PrestasiForm = {
  kategori: "OPEN",
  namaKejuaraan: "",
  tahun: "",
  tingkat: "",
  kelasPertandingan: "",
  file: null,
};

const API_PRESTASI = "/api/keanggotaan/riwayat/prestasi";

export default function TabPrestasi({
  anggota,
  initialData = [],
  onRefetch,
}: {
  anggota?: Anggota;
  initialData?: PrestasiRow[];
  onRefetch?: () => void | Promise<void>;
}) {
  const hasAnggota =
    typeof anggota === "object" &&
    typeof anggota?.nama === "string" &&
    anggota.nama.trim().length > 0;

  const [data, setData] = useState<PrestasiRow[]>(() => initialData ?? []);
  const [form, setForm] = useState<PrestasiForm>(EMPTY_FORM);
  const [edit, setEdit] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Sync initialData when refetched from parent
  useEffect(() => {
    if (Array.isArray(initialData) && initialData.length >= 0) {
      setData(initialData);
    }
  }, [initialData]);

  function handleAdd() {
    setForm(EMPTY_FORM);
    setEditingIndex(null);
    setEdit(true);
    setError(null);
  }

  function handleEdit(idx: number) {
    const p = data[idx];
    setForm({
      kategori: p.kategori || "OPEN",
      namaKejuaraan: p.namaKejuaraan ?? "",
      tahun: p.tahun ?? "",
      tingkat: p.tingkat ?? "",
      kelasPertandingan: p.kelasPertandingan ?? "",
      file: null,
    });
    setEditingIndex(idx);
    setEdit(true);
    setError(null);
  }

  async function handleDelete(idx: number) {
    if (!confirm("Hapus prestasi ini?")) return;
    const item = data[idx];
    if (!item?.id) {
      setData((prev) => prev.filter((_, i) => i !== idx));
      onRefetch?.();
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_PRESTASI}/${item.id}`, { method: "DELETE", credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.message || "Gagal menghapus prestasi");
        return;
      }
      setData((prev) => prev.filter((_, i) => i !== idx));
      onRefetch?.();
    } catch {
      setError("Gagal menghapus prestasi");
    } finally {
      setSubmitting(false);
    }
  }

  function validateFile(file: File): boolean {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Tipe file harus PDF, JPG, atau PNG.");
      return false;
    }
    if (file.size > MAX_SIZE) {
      setError("Ukuran file maksimal 1 MB.");
      return false;
    }
    return true;
  }

  function handleFileChange(file: File | null) {
    if (!file) return;
    if (!validateFile(file)) return;
    setForm((f) => ({ ...f, file }));
    setError(null);
  }

  const previewUrl = useMemo(() => {
    if (!form.file) return null;
    return URL.createObjectURL(form.file);
  }, [form.file]);

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  async function handleSave() {
    if (!hasAnggota) {
      setError("Data anggota belum lengkap.");
      return;
    }
    if (!form.namaKejuaraan.trim()) {
      setError("Nama kejuaraan wajib diisi.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const hasFile = form.file && form.file.size > 0;
      let res: Response;
      if (hasFile) {
        const fd = new FormData();
        fd.set("kategori", form.kategori);
        fd.set("nama_kejuaraan", form.namaKejuaraan.trim());
        fd.set("tahun", form.tahun.trim());
        fd.set("tingkat", form.tingkat.trim() || "");
        fd.set("kelas_pertandingan", form.kelasPertandingan.trim());
        fd.set("file", form.file!);
        if (editingIndex === null) {
          res = await fetch(API_PRESTASI, { method: "POST", body: fd, credentials: "include" });
        } else {
          const id = data[editingIndex]?.id;
          if (!id) {
            setError("Data prestasi tidak valid.");
            setSubmitting(false);
            return;
          }
          res = await fetch(`${API_PRESTASI}/${id}`, { method: "PATCH", body: fd, credentials: "include" });
        }
      } else {
        const body = {
          kategori: form.kategori,
          nama_kejuaraan: form.namaKejuaraan.trim(),
          tahun: form.tahun.trim() || null,
          tingkat: form.tingkat.trim() || null,
          kelas_pertandingan: form.kelasPertandingan.trim() || null,
        };
        if (editingIndex === null) {
          res = await fetch(API_PRESTASI, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            credentials: "include",
          });
        } else {
          const id = data[editingIndex]?.id;
          if (!id) {
            setError("Data prestasi tidak valid.");
            setSubmitting(false);
            return;
          }
          res = await fetch(`${API_PRESTASI}/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            credentials: "include",
          });
        }
      }

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.message || "Gagal menyimpan prestasi");
        return;
      }

      const row: PrestasiRow = {
        id: json.id,
        kategori: json.kategori ?? "OPEN",
        namaKejuaraan: json.namaKejuaraan ?? "",
        tahun: json.tahun ?? "",
        tingkat: json.tingkat ?? "",
        kelasPertandingan: json.kelasPertandingan ?? "",
        fileUrl: json.fileUrl,
        verifiedAt: json.verifiedAt,
        verifiedBy: json.verifiedBy,
      };

      if (editingIndex === null) {
        setData((prev) => [...prev, row]);
      } else {
        setData((prev) =>
          prev.map((p, i) => (i === editingIndex ? row : p))
        );
      }
      setEdit(false);
      setEditingIndex(null);
      setForm(EMPTY_FORM);
      onRefetch?.();
    } catch {
      setError("Gagal menyimpan prestasi");
    } finally {
      setSubmitting(false);
    }
  }

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 30 }, (_, i) => currentYear - i);

  return (
    <div className="mt-3">
      {data.length > 0 && (
        <div className="space-y-2 mb-4">
          <p className="text-xs font-medium text-slate-400">Riwayat Pertandingan</p>

          {data.map((p, i) => (
            <div
              key={p.id ?? i}
              className="rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-2 flex justify-between items-center gap-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-cyan-300 truncate">
                  {p.namaKejuaraan}
                </p>
                <p className="text-xs text-slate-400">
                  {p.kategori}
                  {p.tahun ? ` · ${p.tahun}` : ""}
                  {p.tingkat ? ` · ${p.tingkat}` : ""}
                  {p.kelasPertandingan ? ` · ${p.kelasPertandingan}` : ""}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {p.fileUrl && (
                  <a
                    href={p.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 hover:underline"
                  >
                    Berkas
                  </a>
                )}
                {p.verifiedAt ? (
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 flex items-center gap-1"
                    title="Terverifikasi oleh Ketua Ranting"
                  >
                    <span className="text-emerald-400" aria-hidden>✓</span>
                    Terverifikasi
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300">
                    Menunggu verifikasi
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => handleEdit(i)}
                  className="text-xs text-cyan-300 hover:underline"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(i)}
                  className="text-xs text-red-400 hover:underline"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!edit && data.length === 0 && (
        <p className="text-xs italic text-slate-400">Belum ada riwayat prestasi.</p>
      )}

      {edit && (
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 space-y-3">
          <div>
            <label className="text-xs text-slate-400">Kategori</label>
            <select
              value={form.kategori}
              onChange={(e) =>
                setForm((f) => ({ ...f, kategori: e.target.value }))
              }
              className="w-full mt-1 rounded bg-slate-800 px-2 py-1 text-sm"
            >
              {KATEGORI_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400">Nama Kejuaraan</label>
            <input
              type="text"
              value={form.namaKejuaraan}
              onChange={(e) =>
                setForm((f) => ({ ...f, namaKejuaraan: e.target.value }))
              }
              placeholder="Contoh: Kejurnas INKAI 2024"
              className="w-full mt-1 rounded bg-slate-800 px-2 py-1 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400">Tahun</label>
            <select
              value={form.tahun}
              onChange={(e) =>
                setForm((f) => ({ ...f, tahun: e.target.value }))
              }
              className="w-full mt-1 rounded bg-slate-800 px-2 py-1 text-sm"
            >
              <option value="">— Pilih Tahun —</option>
              {yearOptions.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400">Tingkat</label>
            <select
              value={form.tingkat}
              onChange={(e) =>
                setForm((f) => ({ ...f, tingkat: e.target.value }))
              }
              className="w-full mt-1 rounded bg-slate-800 px-2 py-1 text-sm"
            >
              {TINGKAT_OPTIONS.map((o) => (
                <option key={o.value || "x"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400">Kelas Pertandingan</label>
            <input
              type="text"
              value={form.kelasPertandingan}
              onChange={(e) =>
                setForm((f) => ({ ...f, kelasPertandingan: e.target.value }))
              }
              placeholder="Contoh: Kata Perorangan, Kumite -55 kg"
              className="w-full mt-1 rounded bg-slate-800 px-2 py-1 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Upload berkas (sertifikat/bukti)
            </label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              id="upload-prestasi"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            />
            <label
              htmlFor="upload-prestasi"
              className="block cursor-pointer rounded-lg border border-dashed border-slate-600 bg-slate-800 px-3 py-2 text-xs text-cyan-300"
            >
              Unggah berkas
            </label>
            {editingIndex !== null && !form.file && (
              <p className="mt-1 text-[11px] text-slate-400">
                Berkas lama tetap digunakan
              </p>
            )}
            {form.file && (
              <p className="mt-1 text-[11px] text-emerald-300">
                ✔ {form.file.name}
              </p>
            )}
            {previewUrl && (
              <div className="mt-2 border border-slate-700 rounded bg-black p-2">
                {form.file?.type === "application/pdf" ? (
                  <iframe src={previewUrl} className="w-full h-40" title="Preview" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- blob preview
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-40 mx-auto object-contain"
                  />
                )}
              </div>
            )}
          </div>

          {error && <p className="text-xs text-red-400">⚠ {error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setEdit(false);
                setEditingIndex(null);
                setForm(EMPTY_FORM);
                setError(null);
              }}
              className="px-3 py-1.5 rounded text-xs bg-slate-800"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={submitting}
              className="px-3 py-1.5 rounded text-xs bg-cyan-400 text-slate-900 disabled:opacity-60"
            >
              {submitting ? "Menyimpan…" : "Simpan"}
            </button>
          </div>
        </div>
      )}

      {!edit && (
        <button
          type="button"
          onClick={handleAdd}
          className="mt-4 w-full text-xs py-2 rounded-md border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 transition"
        >
          + Tambah Prestasi
        </button>
      )}
    </div>
  );
}
