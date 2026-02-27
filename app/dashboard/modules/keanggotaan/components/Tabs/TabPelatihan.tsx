"use client";

import { useState, useMemo } from "react";

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

/* ===============================
   TYPES
================================ */
type SertifikatItem = {
  id: string;
  nama: string;
  tanggal: string;
  kategori: string;
};

type PelatihanForm = {
  nama: string;
  tanggal: string;
  kategori: string;
  file?: File | null;
};

/* ===============================
   EMPTY FORM
================================ */
const EMPTY_FORM: PelatihanForm = {
  nama: "",
  tanggal: "",
  kategori: "PELATIHAN",
  file: null,
};

type PelatihanInitialData = { id: string; nama: string; tanggal: string; kategori: string }[];

export default function TabPelatihan({
  initialData = [],
}: {
  initialData?: PelatihanInitialData;
} = {}) {
  /* ===============================
     STATE (isi awal dari DB via initialData)
  =============================== */
  const [data, setData] = useState<SertifikatItem[]>(() => initialData ?? []);
  const [form, setForm] = useState<PelatihanForm>(EMPTY_FORM);
  const [edit, setEdit] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    const s = data[idx];
    setForm({
      nama: s.nama,
      tanggal: s.tanggal,
      kategori: s.kategori,
      file: null, // file lama tidak dimuat ulang
    });
    setEditingIndex(idx);
    setEdit(true);
    setError(null);
  }

  function handleDelete(idx: number) {
    if (!confirm("Hapus data pelatihan ini?")) return;
    setData((prev) => prev.filter((_, i) => i !== idx));
  }

  /* ===============================
     FILE HANDLING
  =============================== */
  function validateFile(file: File): boolean {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Tipe file tidak didukung (PDF, JPG, PNG).");
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

  /* ===============================
     SAVE
  =============================== */
  function handleSave() {
    if (!form.nama || !form.tanggal) {
      setError("Nama dan tanggal pelatihan wajib diisi.");
      return;
    }
    if (!form.file && editingIndex === null) {
      setError("Sertifikat wajib diunggah.");
      return;
    }

    if (editingIndex === null) {
      // CREATE
      setData((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          nama: form.nama,
          tanggal: form.tanggal,
          kategori: form.kategori,
        },
      ]);
    } else {
      // UPDATE
      setData((prev) =>
        prev.map((s, i) =>
          i === editingIndex
            ? {
                ...s,
                nama: form.nama,
                tanggal: form.tanggal,
                kategori: form.kategori,
              }
            : s,
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
          <p className="text-xs text-slate-400 font-medium">
            Riwayat Pelatihan
          </p>

          {data.map((s, i) => (
            <div
              key={s.id}
              className="rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-2 flex justify-between items-center"
            >
              <div>
                <p className="text-sm font-semibold text-emerald-300">
                  {s.nama}
                </p>
                <p className="text-xs text-slate-400">{s.tanggal}</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300">
                  {s.kategori}
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
        <p className="text-xs italic text-slate-400">Belum ada pelatihan.</p>
      )}

      {/* FORM */}
      {edit && (
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 space-y-3">
          <div>
            <label className="text-xs text-slate-400">Nama Pelatihan</label>
            <input
              value={form.nama}
              onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))}
              className="w-full mt-1 rounded bg-slate-800 px-2 py-1 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400">Tanggal</label>
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
              Sertifikat Pelatihan
            </label>

            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              id="upload-pelatihan"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            />

            <label
              htmlFor="upload-pelatihan"
              className="block cursor-pointer rounded-lg border border-dashed border-slate-600 bg-slate-800 px-3 py-2 text-xs text-emerald-300"
            >
              Unggah Sertifikat
            </label>

            {form.file && (
              <p className="mt-1 text-[11px] text-emerald-300">
                ✔ {form.file.name}
              </p>
            )}

            {previewUrl && (
              <div className="mt-2 border border-slate-700 rounded bg-black p-2">
                {form.file?.type === "application/pdf" ? (
                  <iframe src={previewUrl} className="w-full h-40" />
                ) : (
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
              }}
              className="px-3 py-1.5 rounded text-xs bg-slate-800"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 rounded text-xs bg-emerald-400 text-slate-900"
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
          className="mt-4 w-full text-xs py-2 rounded-md border border-emerald-500/40
                     text-emerald-300 hover:bg-emerald-500/10 transition"
        >
          + Tambah Pelatihan
        </button>
      )}
    </div>
  );
}
