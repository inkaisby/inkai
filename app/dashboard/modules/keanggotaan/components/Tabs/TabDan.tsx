"use client";

import { useState, useMemo, useEffect } from "react";
import { Anggota } from "../../types/Anggota";

/* ===============================
   CONFIG
================================ */
const MAX_SIZE = 1 * 1024 * 1024;
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
];

const DAN_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];

/* ===============================
   TYPES
================================ */
type DanItem = {
  dan: number;
  tanggal?: string;
  mshNumber?: string;
};

type DanWithMeta = DanItem & {
  verified?: boolean;
};

type DanForm = {
  dan: number;
  tanggal: string;
  mshNumber?: string;
  file?: File | null;
};

/* ===============================
   EMPTY FORM
================================ */
const EMPTY_FORM: DanForm = {
  dan: 1,
  tanggal: "",
  mshNumber: "",
  file: null,
};

type DanInitialData = { dan: number; tanggal?: string; mshNumber?: string }[];

export default function TabDan({
  anggota,
  initialData = [],
}: {
  anggota?: Anggota;
  initialData?: DanInitialData;
}) {
  /* ===============================
     GUARD
  =============================== */
  const hasAnggota =
    typeof anggota === "object" &&
    typeof anggota?.nama === "string" &&
    anggota.nama.trim().length > 0;

  /* ===============================
     STATE (isi awal dari DB via initialData)
  =============================== */
  const [data, setData] = useState<DanWithMeta[]>(
    () => (initialData ?? []).map((d) => ({ dan: d.dan, tanggal: d.tanggal, mshNumber: d.mshNumber }))
  );

  const [form, setForm] = useState<DanForm>(EMPTY_FORM);
  const [edit, setEdit] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* ===============================
     HELPERS
  =============================== */
  function generateIjazahFileName(level: number) {
    if (!hasAnggota) return "";
    const safeName = anggota!.nama.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
    return `DAN-${level}_${safeName}.pdf`;
  }

  function existingDans(exceptIdx?: number) {
    return data.filter((_, i) => i !== exceptIdx).map((d) => d.dan);
  }

  /* ===============================
     ACTIONS (SAMA DENGAN TABPELATIHAN)
  =============================== */
  function handleAdd() {
    setForm(EMPTY_FORM);
    setEditingIndex(null);
    setEdit(true);
    setError(null);
  }

  function handleEdit(idx: number) {
    const d = data[idx];
    setForm({
      dan: d.dan,
      tanggal: d.tanggal ?? "",
      mshNumber: d.mshNumber,
      file: null, // file lama tidak dimuat ulang
    });
    setEditingIndex(idx);
    setEdit(true);
    setError(null);
  }

  function handleDelete(idx: number) {
    if (!confirm("Hapus riwayat DAN ini?")) return;
    setData((prev) => prev.filter((_, i) => i !== idx));
  }

  /* ===============================
     FILE HANDLING
  =============================== */
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

  /* ===============================
     SAVE (INI KUNCI UTAMA)
  =============================== */
  function handleSave() {
    if (!hasAnggota) {
      setError("Data anggota belum lengkap.");
      return;
    }
    if (!form.tanggal) {
      setError("Tanggal penetapan wajib diisi.");
      return;
    }
    if (!form.file && editingIndex === null) {
      setError("Ijazah DAN wajib diunggah.");
      return;
    }

    if (editingIndex === null) {
      // CREATE
      setData((prev) => [
        ...prev,
        {
          dan: form.dan,
          tanggal: form.tanggal,
          mshNumber: form.mshNumber,
          verified: false,
        },
      ]);
    } else {
      // UPDATE
      setData((prev) =>
        prev.map((d, i) =>
          i === editingIndex
            ? {
                ...d,
                dan: form.dan,
                tanggal: form.tanggal,
                mshNumber: form.mshNumber,
              }
            : d,
        ),
      );
    }

    setEdit(false);
    setEditingIndex(null);
    setForm(EMPTY_FORM);
  }

  /* ===============================
     RENDER
  =============================== */
  return (
    <div className="mt-3">
      {/* RIWAYAT */}
      {data.length > 0 && (
        <div className="space-y-2 mb-4">
          <p className="text-xs font-medium text-slate-400">Riwayat DAN</p>

          {data.map((d, i) => (
            <div
              key={i}
              className="rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-2 flex justify-between items-center"
            >
              <div>
                <p className="text-sm font-semibold text-cyan-300">
                  DAN {d.dan}
                </p>
                <p className="text-xs text-slate-400">{d.tanggal}</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300">
                  Draft
                </span>

                <button
                  onClick={() => handleEdit(i)}
                  className="text-xs text-cyan-300 hover:underline"
                >
                  ✏️
                </button>
                <button
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

      {/* EMPTY */}
      {!edit && data.length === 0 && (
        <p className="text-xs italic text-slate-400">Belum memiliki DAN.</p>
      )}

      {/* FORM */}
      {edit && (
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 space-y-3">
          <div>
            <label className="text-xs text-slate-400">Tingkat DAN</label>
            <select
              value={form.dan}
              onChange={(e) =>
                setForm((f) => ({ ...f, dan: Number(e.target.value) }))
              }
              className="w-full mt-1 rounded bg-slate-800 px-2 py-1 text-sm"
            >
              {DAN_OPTIONS.map((d) => (
                <option
                  key={d}
                  value={d}
                  disabled={existingDans(editingIndex ?? undefined).includes(d)}
                >
                  DAN {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400">Tanggal Penetapan</label>
            <input
              type="date"
              value={form.tanggal}
              onChange={(e) =>
                setForm((f) => ({ ...f, tanggal: e.target.value }))
              }
              className="w-full mt-1 rounded bg-slate-800 px-2 py-1 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Ijazah DAN
            </label>

            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              id="upload-dan"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            />

            <label
              htmlFor="upload-dan"
              className="block cursor-pointer rounded-lg border border-dashed border-slate-600 bg-slate-800 px-3 py-2 text-xs text-cyan-300"
            >
              Unggah Ijazah DAN
            </label>

            {editingIndex !== null && !form.file && (
              <p className="mt-1 text-[11px] text-slate-400">
                Ijazah lama tetap digunakan
              </p>
            )}

            {form.file && (
              <p className="mt-1 text-[11px] text-emerald-300">
                ✔ {generateIjazahFileName(form.dan)}
              </p>
            )}

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
                setForm(EMPTY_FORM);
                setError(null);
              }}
              className="px-3 py-1.5 rounded text-xs bg-slate-800"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 rounded text-xs bg-cyan-400 text-slate-900"
            >
              Simpan
            </button>
          </div>
        </div>
      )}

      {/* ADD */}
      {!edit && (
        <button
          onClick={handleAdd}
          className="mt-4 w-full text-xs py-2 rounded-md border border-cyan-500/40
                     text-cyan-300 hover:bg-cyan-500/10 transition"
        >
          + Tambah DAN
        </button>
      )}
    </div>
  );
}
