"use client";

import { useState, useMemo, useEffect } from "react";
import { Anggota, KyuItem } from "../../types";

/* ===============================
   WARNA SABUK
================================ */
const KYU_WARNA_MAP: Record<number, string> = {
  10: "Putih",
  9: "Kuning",
  8: "Kuning",
  7: "Kuning",
  6: "Hijau",
  5: "Biru",
  4: "Biru",
  3: "Coklat",
  2: "Coklat",
  1: "Coklat",
};

/* ===============================
   OPTIONS
================================ */
const KYU_OPTIONS = Array.from({ length: 10 }, (_, i) => {
  const level = 10 - i;
  return {
    level,
    label: `KYU ${level} – Sabuk ${KYU_WARNA_MAP[level]}`,
  };
});

const MAX_SIZE = 1 * 1024 * 1024;
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
];

/* ===============================
   TYPES
================================ */
type KyuWithMeta = KyuItem & {
  verified?: boolean;
  file?: File | null;
};

type KyuForm = {
  level: number;
  warna: string;
  noIjazah: string;
  tanggalIjazah: string;
  file?: File | null;
};

const EMPTY_FORM: KyuForm = {
  level: 10,
  warna: KYU_WARNA_MAP[10],
  noIjazah: "",
  tanggalIjazah: "",
  file: null,
};

const API_KYU = "/api/keanggotaan/riwayat/kyu";

export default function TabKyu({
  initialData = [],
  anggota,
  onRefetch,
}: {
  initialData?: KyuWithMeta[];
  anggota?: Anggota;
  onRefetch?: () => void | Promise<void>;
}) {
  /* ===============================
     STATE (isi awal dari DB; parent pakai key agar remount saat data load)
  =============================== */
  const [data, setData] = useState<KyuWithMeta[]>(() => initialData ?? []);

  const [form, setForm] = useState<KyuForm>(EMPTY_FORM);
  const [edit, setEdit] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const hasAnggota =
    typeof anggota?.nama === "string" && anggota.nama.trim().length > 0;

  /* ===============================
     ACTIONS
  =============================== */
  function handleAdd() {
    setForm(EMPTY_FORM);
    setEditingIndex(null);
    setEdit(true);
    setError(null);
  }

  function handleEdit(idx: number) {
    const k = data[idx];
    setForm({
      level: k.level,
      warna: KYU_WARNA_MAP[k.level],
      noIjazah: k.noIjazah ?? "",
      tanggalIjazah: k.tanggalIjazah ?? "",
      file: null,
    });
    setEditingIndex(idx);
    setEdit(true);
    setError(null);
  }

  async function handleDelete(idx: number) {
    if (!confirm("Hapus data KYU ini?")) return;
    const item = data[idx];
    if (!item?.id) {
      setData((prev) => prev.filter((_, i) => i !== idx));
      onRefetch?.();
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_KYU}/${item.id}`, { method: "DELETE", credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.message || "Gagal menghapus KYU");
        return;
      }
      setData((prev) => prev.filter((_, i) => i !== idx));
      onRefetch?.();
    } catch {
      setError("Gagal menghapus KYU");
    } finally {
      setSubmitting(false);
    }
  }

  /* ===============================
     FILE
  =============================== */
  function validateFile(file: File): boolean {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Tipe file harus PDF atau gambar.");
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

  /* ===============================
     SAVE (persist ke DB)
  =============================== */
  async function handleSave() {
    if (!hasAnggota) {
      setError("Data anggota belum lengkap.");
      return;
    }
    if (!form.noIjazah || !form.tanggalIjazah) {
      setError("No. dan tanggal ijazah wajib diisi.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const hasFile = form.file && form.file.size > 0;
      let res: Response;
      if (hasFile) {
        const fd = new FormData();
        fd.set("level", String(form.level));
        fd.set("no_ijazah", form.noIjazah);
        fd.set("tanggal_ijazah", form.tanggalIjazah);
        fd.set("file", form.file);
        if (editingIndex === null) {
          res = await fetch(API_KYU, { method: "POST", body: fd, credentials: "include" });
        } else {
          const id = data[editingIndex]?.id;
          if (!id) {
            setError("Data KYU tidak valid.");
            setSubmitting(false);
            return;
          }
          res = await fetch(`${API_KYU}/${id}`, { method: "PATCH", body: fd, credentials: "include" });
        }
      } else {
        const body = {
          level: form.level,
          no_ijazah: form.noIjazah,
          tanggal_ijazah: form.tanggalIjazah,
        };
        if (editingIndex === null) {
          res = await fetch(API_KYU, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            credentials: "include",
          });
        } else {
          const id = data[editingIndex]?.id;
          if (!id) {
            setError("Data KYU tidak valid.");
            setSubmitting(false);
            return;
          }
          res = await fetch(`${API_KYU}/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            credentials: "include",
          });
        }
      }

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.message || "Gagal menyimpan KYU");
        return;
      }

      if (editingIndex === null) {
        setData((prev) => [
          ...prev,
          {
            id: json.id,
            level: json.level,
            warna: KYU_WARNA_MAP[json.level],
            noIjazah: json.noIjazah,
            tanggalIjazah: json.tanggalIjazah,
            fileUrl: json.fileUrl,
            verified: false,
            file: form.file,
          },
        ]);
      } else {
        setData((prev) =>
          prev.map((k, i) =>
            i === editingIndex
              ? {
                  ...k,
                  level: json.level,
                  warna: KYU_WARNA_MAP[json.level],
                  noIjazah: json.noIjazah,
                  tanggalIjazah: json.tanggalIjazah,
                  fileUrl: json.fileUrl ?? k.fileUrl,
                }
              : k,
          ),
        );
      }
      setEdit(false);
      setEditingIndex(null);
      setForm(EMPTY_FORM);
      onRefetch?.();
    } catch {
      setError("Gagal menyimpan KYU");
    } finally {
      setSubmitting(false);
    }
  }

  /* ===============================
     RENDER
  =============================== */
  return (
    <div className="mt-3">
      {/* RIWAYAT */}
      {data.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-xs text-slate-400 font-medium">
            Riwayat Ujian KYU
          </p>

          {data.map((k, i) => {
            const fromUkt = k.id.startsWith("ukt-") || (k as KyuWithMeta & { fromUkt?: boolean }).fromUkt;
            return (
              <div
                key={k.id}
                className="flex justify-between items-center rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-2"
              >
                <div>
                  <p className="text-sm text-cyan-300 font-semibold">
                    KYU {k.level} – Sabuk {KYU_WARNA_MAP[k.level]}
                  </p>
                  {fromUkt ? (
                    <p className="text-xs text-slate-400">
                      Dari hasil UKT (terisi otomatis oleh Cabang)
                      {k.tanggalIjazah ? ` — ${k.tanggalIjazah}` : ""}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400">
                      No. Ijazah: {k.noIjazah ?? "—"}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 items-center flex-wrap">
                  {fromUkt && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-400/20 text-violet-300">
                      Dari hasil UKT
                    </span>
                  )}
                  {k.fileUrl && (
                    <a
                      href={k.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 hover:underline"
                    >
                      Lihat ijazah
                    </a>
                  )}
                  {!fromUkt && (
                    <>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full ${
                          k.verified
                            ? "bg-emerald-400/20 text-emerald-300"
                            : "bg-yellow-400/20 text-yellow-300"
                        }`}
                      >
                        {k.verified ? "Terverifikasi" : "Draft"}
                      </span>
                      <button
                        onClick={() => handleEdit(i)}
                        className="text-xs text-cyan-300"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(i)}
                        className="text-xs text-red-400"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* EMPTY */}
      {!edit && data.length === 0 && (
        <p className="text-xs italic text-slate-400">
          Belum ada data ujian KYU.
        </p>
      )}

      {/* FORM */}
      {edit && (
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 space-y-3">
          <div>
            <label className="text-xs text-slate-400">Pilih KYU</label>
            <select
              value={form.level}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  level: Number(e.target.value),
                  warna: KYU_WARNA_MAP[Number(e.target.value)],
                }))
              }
              className="w-full mt-1 rounded bg-slate-800 px-2 py-1 text-sm"
            >
              {KYU_OPTIONS.map((k) => (
                <option key={k.level} value={k.level}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400">No. Ijazah</label>
            <input
              value={form.noIjazah}
              onChange={(e) =>
                setForm((f) => ({ ...f, noIjazah: e.target.value }))
              }
              className="w-full mt-1 rounded bg-slate-800 px-2 py-1 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400">Tanggal Ijazah</label>
            <input
              type="date"
              value={form.tanggalIjazah}
              onChange={(e) =>
                setForm((f) => ({ ...f, tanggalIjazah: e.target.value }))
              }
              className="w-full mt-1 rounded bg-slate-800 px-2 py-1 text-sm"
            />
          </div>

          <div>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              id="upload-kyu"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            />
            <label
              htmlFor="upload-kyu"
              className="block cursor-pointer rounded-lg border border-dashed border-slate-600 bg-slate-800 px-3 py-2 text-xs text-cyan-300"
            >
              Unggah Ijazah KYU
            </label>

            {previewUrl && (
              <div className="mt-2 border border-slate-700 rounded bg-black p-2">
                {form.file?.type === "application/pdf" ? (
                  <iframe src={previewUrl} className="w-full h-40" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- blob preview URL
                  <img
                    src={previewUrl}
                    alt="Preview lampiran"
                    className="max-h-40 mx-auto object-contain"
                  />
                )}
              </div>
            )}
          </div>

          {error && <p className="text-xs text-red-400">⚠ {error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => {
                setEdit(false);
                setEditingIndex(null);
                setError(null);
              }}
              className="px-3 py-1.5 text-xs rounded bg-slate-800"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={submitting}
              className="px-3 py-1.5 text-xs rounded bg-cyan-400 text-slate-900 disabled:opacity-60"
            >
              {submitting ? "Menyimpan…" : "Simpan"}
            </button>
          </div>
        </div>
      )}

      {!edit && (
        <button
          onClick={handleAdd}
          className="mt-4 w-full text-xs py-2 rounded-md border border-cyan-500/40
                     text-cyan-300 hover:bg-cyan-500/10 transition"
        >
          + Tambah KYU
        </button>
      )}
    </div>
  );
}
