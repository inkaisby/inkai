"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2 } from "lucide-react";

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

type CabangOption = { id: string; nama: string };

export default function RantingModule() {
  const [rantingList, setRantingList] = useState<RantingRow[]>([]);
  const [cabangList, setCabangList] = useState<CabangOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<RantingRow | null>(null);

  const [form, setForm] = useState({
    nama: "",
    cabang_id: "",
    instagram_url: "",
  });

  const loadRanting = useCallback(async () => {
    const res = await fetch("/api/ranting", { credentials: "include" });
    if (!res.ok) {
      setRantingList([]);
      return;
    }
    const data = await res.json();
    setRantingList(Array.isArray(data) ? data : []);
  }, []);

  const loadCabang = useCallback(async () => {
    const res = await fetch("/api/cabang", { credentials: "include" });
    if (!res.ok) {
      setCabangList([]);
      // eslint-disable-next-line no-console
      console.warn("[RantingModule] Gagal memuat cabang:", res.status);
      return;
    }
    const data = await res.json();
    const list = Array.isArray(data) ? data : [];
    setCabangList(list);
    // eslint-disable-next-line no-console
    console.log("[RantingModule] cabang loaded", list);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadRanting(), loadCabang()]).finally(() => {
      setLoading(false);
    });
  }, [loadRanting, loadCabang]);

  const handleOpenForm = (row?: RantingRow) => {
    if (row) {
      setEditing(row);
      setForm({
        nama: row.nama,
        cabang_id: row.cabang_id ?? "",
        instagram_url: row.instagram_url ?? "",
      });
    } else {
      setEditing(null);
      setForm({
        nama: "",
        cabang_id: cabangList[0]?.id ?? "",
        instagram_url: "",
      });
    }
    setError(null);
    setOpenForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const nama = form.nama.trim();
    if (!nama) {
      setError("Nama ranting wajib diisi.");
      return;
    }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        nama,
        instagram_url: form.instagram_url.trim() || null,
      };
      if (form.cabang_id) payload.cabang_id = form.cabang_id;

      const res = await fetch("/api/ranting", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(
          editing ? { id: editing.id, ...payload } : { ...payload, aktif: true },
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          data.message ??
            (editing ? "Gagal memperbarui ranting." : "Gagal menambah ranting."),
        );
        return;
      }
      setOpenForm(false);
      setEditing(null);
      await loadRanting();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-white/60 text-sm animate-pulse">
        Memuat daftar ranting…
      </div>
    );
  }

  const cabangNameById = new Map<string, string>();
  cabangList.forEach((c) => {
    cabangNameById.set(c.id, c.nama);
  });

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="h-7 w-7 text-sky-400" />
          <div>
            <h1 className="text-xl font-semibold text-white">Ranting</h1>
            <p className="text-sm text-white/50 mt-0.5">
              Kelola ranting (Airlangga, J-Won, Gading, Manyar, Cakra Koarmatim, dll.) sesuai
              wilayah dan cabang yang Anda kelola.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleOpenForm}
          className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium transition-colors"
        >
          + Tambah Ranting
        </button>
      </header>

      <div className="rounded-lg border border-white/10 overflow-hidden">
        {rantingList.length === 0 ? (
          <div className="p-8 text-center text-white/50 text-sm">
            Belum ada ranting. Klik &quot;Tambah Ranting&quot; untuk mengisi manual (mis.
            Airlangga, J-Won, Gading, Manyar).
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-left">
                <th className="px-4 py-3 text-white/70 font-medium">Nama</th>
                <th className="px-4 py-3 text-white/70 font-medium">Cabang</th>
                <th className="px-4 py-3 text-white/70 font-medium">Status</th>
                <th className="px-4 py-3 text-white/70 font-medium">Instagram</th>
                <th className="px-4 py-3 text-white/70 font-medium text-right">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {rantingList.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-white/5 hover:bg-white/5"
                >
                  <td className="px-4 py-3 text-white">{r.nama}</td>
                  <td className="px-4 py-3 text-white/70">
                    {r.cabang_id ? cabangNameById.get(r.cabang_id) ?? "—" : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        r.aktif ? "text-emerald-400" : "text-white/40"
                      }
                    >
                      {r.aktif ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/60">
                    {r.instagram_url ? (
                      <a
                        href={r.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-400 hover:underline"
                      >
                        {r.instagram_url.replace(/^https?:\/\//, "").slice(0, 30)}
                        …
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => handleOpenForm(r)}
                        className="px-2 py-1 rounded border border-sky-500/60 text-sky-300 hover:bg-sky-500/10"
                      >
                        Ubah
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (
                            !window.confirm(
                              `Ubah status ranting \"${r.nama}\" menjadi ${
                                r.aktif ? "Nonaktif" : "Aktif"
                              }?`,
                            )
                          ) {
                            return;
                          }
                          const res = await fetch("/api/ranting", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify({ id: r.id, aktif: !r.aktif }),
                          });
                          if (res.ok) {
                            await loadRanting();
                          }
                        }}
                        className="px-2 py-1 rounded border border-amber-500/60 text-amber-300 hover:bg-amber-500/10"
                      >
                        {r.aktif ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (
                            !window.confirm(
                              `Hapus ranting \"${r.nama}\"? Tindakan ini tidak dapat dibatalkan.`,
                            )
                          ) {
                            return;
                          }
                          const res = await fetch(
                            `/api/ranting?id=${encodeURIComponent(r.id)}`,
                            {
                              method: "DELETE",
                              credentials: "include",
                            },
                          );
                          if (res.ok) {
                            await loadRanting();
                          }
                        }}
                        className="px-2 py-1 rounded border border-red-500/60 text-red-300 hover:bg-red-500/10"
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {openForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => !submitting && setOpenForm(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-white/10 bg-[#0b1220] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-white mb-4">
              Tambah Ranting (isi manual)
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm text-white/70 mb-1">
                  Nama ranting <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.nama}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, nama: e.target.value }))
                  }
                  placeholder="Contoh: Airlangga, J-Won, Gading, Manyar, Cakra Koarmatim"
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-1">
                  Cabang
                </label>
                {cabangList.length === 0 ? (
                  <input
                    type="text"
                    value="Belum ada data cabang di database. Ranting akan disimpan tanpa cabang (hanya berdasarkan wilayah)."
                    disabled
                    className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white/60 cursor-not-allowed text-xs"
                  />
                ) : (
                  <select
                    value={form.cabang_id}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, cabang_id: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                  >
                    <option value="">— Pilih cabang (opsional) —</option>
                    {cabangList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nama}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-1">
                  Instagram (opsional)
                </label>
                <input
                  type="url"
                  value={form.instagram_url}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, instagram_url: e.target.value }))
                  }
                  placeholder="https://instagram.com/..."
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-sm font-medium"
                >
                  {submitting ? "Menyimpan…" : "Simpan"}
                </button>
                <button
                  type="button"
                  onClick={() => !submitting && setOpenForm(false)}
                  className="px-4 py-2 rounded-lg border border-white/20 text-white/80 hover:bg-white/10 text-sm"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

