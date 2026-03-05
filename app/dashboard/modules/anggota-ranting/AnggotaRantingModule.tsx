"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Users } from "lucide-react";

import JarvisLoader from "@/components/JarvisLoader";

type AnggotaRow = {
  profile_id: string;
  nama: string;
  nik?: string;
  nomor: string;
  status: string;
  kyu_dan_terakhir: string;
};

export default function AnggotaRantingModule() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const rantingId = searchParams.get("ranting_id") ?? "";
  const rantingNamaParam = searchParams.get("ranting_nama") ?? "";

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AnggotaRow[]>([]);
  const [search, setSearch] = useState("");
  const [showSingleForm, setShowSingleForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [singleForm, setSingleForm] = useState({
    nik: "",
    nomor: "",
    nama: "",
  });
  const [bulkText, setBulkText] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadData = async () => {
    if (!rantingId) return;
    setLoading(true);
    const params = new URLSearchParams({ ranting_id: rantingId });
    try {
      const res = await fetch(`/api/ukt/anggota-aktif?${params.toString()}`, {
        credentials: "include",
      });
      const d = await res.json();
      setData(Array.isArray(d) ? d : []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rantingId]);

  const filtered = useMemo(
    () =>
      data.filter((a) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          a.nama.toLowerCase().includes(q) ||
          (a.nik && a.nik.toLowerCase().includes(q)) ||
          (a.nomor && a.nomor.toLowerCase().includes(q))
        );
      }),
    [data, search],
  );

  if (!rantingId) {
    return (
      <div className="px-6 py-10">
        <div className="mx-auto max-w-3xl rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-sm text-emerald-50 space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-300" />
            <h1 className="text-base font-semibold text-emerald-100">
              Anggota Ranting
            </h1>
          </div>
          <p>
            Halaman ini menampilkan daftar anggota aktif di satu ranting. Silakan pilih
            ranting dari panel <span className="font-semibold">Cabang per kabupaten/kota</span>{" "}
            lalu klik tombol <span className="font-semibold">Kelola anggota</span>.
          </p>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="mt-2 inline-flex items-center rounded-lg border border-emerald-400/60 px-3 py-1.5 text-xs font-medium text-emerald-100 hover:bg-emerald-500/10"
          >
            Kembali ke Home Base
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-400/40">
              <Users className="h-5 w-5 text-emerald-300" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white/95">
                Anggota Ranting
              </h1>
              <p className="text-xs text-white/60">
                Daftar anggota aktif di ranting{" "}
                <span className="font-semibold text-emerald-200">
                  {rantingNamaParam || "terpilih"}
                </span>
                .
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs text-white/75 hover:bg-white/10"
            >
              Kembali
            </button>
            <button
              type="button"
              onClick={() => {
                loadData();
              }}
              className="rounded-lg border border-white/15 bg-white/[0.03] px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
            >
              Muat ulang
            </button>
          </div>
        </header>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-white/60">
              Total anggota aktif:{" "}
              <span className="font-semibold text-emerald-200">{data.length}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama / No. Anggota…"
                className="w-56 rounded-md border border-white/20 bg-black/40 px-3 py-1.5 text-xs text-white placeholder:text-white/40 focus:border-emerald-400/80 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowSingleForm(true)}
                className="rounded-lg border border-emerald-500/60 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-100 hover:bg-emerald-500/20"
              >
                Tambah satuan
              </button>
              <button
                type="button"
                onClick={() => setShowBulkForm(true)}
                className="rounded-lg border border-white/20 bg-white/[0.02] px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
              >
                Tambah massal
              </button>
            </div>
          </div>

          {loading ? (
            <div className="mt-4">
              <JarvisLoader label="Memuat anggota ranting…" />
            </div>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-lg border border-white/10">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.03] text-left text-white/60">
                    <th className="px-3 py-2">Nama</th>
                    <th className="px-3 py-2">NIK</th>
                    <th className="px-3 py-2">No. Anggota</th>
                    <th className="px-3 py-2">Kyu/Dan</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <tr
                      key={a.profile_id}
                      className="border-b border-white/5 hover:bg-white/[0.03]"
                    >
                      <td className="px-3 py-2 text-white/90">{a.nama}</td>
                      <td className="px-3 py-2 text-white/70">
                        {a.nik || "—"}
                      </td>
                      <td className="px-3 py-2 text-white/70">
                        {a.nomor || "—"}
                      </td>
                      <td className="px-3 py-2 text-white/70">
                        {a.kyu_dan_terakhir}
                      </td>
                      <td className="px-3 py-2 text-emerald-300">
                        {a.status || "AKTIF"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <p className="px-3 py-4 text-center text-xs text-white/50">
                  Belum ada anggota aktif yang cocok dengan filter.
                </p>
              )}
            </div>
          )}

          <p className="pt-2 text-[11px] text-white/45">
            Pengelolaan detail anggota (No. Anggota, status, data profil) tetap melalui
            menu <span className="font-semibold">Profil / Keanggotaan</span>. Halaman ini
            hanya ringkasan anggota aktif per ranting.
          </p>
        </div>

        {showSingleForm && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70">
            <div className="w-full max-w-md rounded-xl border border-white/15 bg-zinc-950/95 p-5 text-xs text-white/80 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-white">
                  Tambah anggota (satuan)
                </h2>
                <button
                  type="button"
                  onClick={() => setShowSingleForm(false)}
                  className="text-[11px] text-white/60 hover:text-white/90"
                >
                  Tutup
                </button>
              </div>
              <p className="text-[11px] text-white/55">
                Isian ini akan dipakai untuk membuat / menghubungkan profil anggota di
                ranting <span className="font-semibold">{rantingNamaParam}</span>. Pastikan{" "}
                <span className="font-semibold">NIK</span>,{" "}
                <span className="font-semibold">No. Anggota</span>, dan{" "}
                <span className="font-semibold">nama</span> selaras dengan data resmi.
              </p>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-white/60">NIK</label>
                  <input
                    type="text"
                    value={singleForm.nik}
                    onChange={(e) =>
                      setSingleForm((f) => ({ ...f, nik: e.target.value }))
                    }
                    className="w-full rounded-md border border-white/20 bg-black/40 px-3 py-1.5 text-xs text-white placeholder:text-white/35 focus:border-emerald-400/80 focus:outline-none"
                    placeholder="16 digit NIK"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-white/60">No. Anggota</label>
                  <input
                    type="text"
                    value={singleForm.nomor}
                    onChange={(e) =>
                      setSingleForm((f) => ({ ...f, nomor: e.target.value }))
                    }
                    className="w-full rounded-md border border-white/20 bg-black/40 px-3 py-1.5 text-xs text-white placeholder:text-white/35 focus:border-emerald-400/80 focus:outline-none"
                    placeholder="Nomor keanggotaan (unik)"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-white/60">Nama lengkap</label>
                  <input
                    type="text"
                    value={singleForm.nama}
                    onChange={(e) =>
                      setSingleForm((f) => ({ ...f, nama: e.target.value }))
                    }
                    className="w-full rounded-md border border-white/20 bg-black/40 px-3 py-1.5 text-xs text-white placeholder:text-white/35 focus:border-emerald-400/80 focus:outline-none"
                    placeholder="Nama sesuai identitas"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-white/50">
                  Setelah backend siap, submit di sini akan membuat / menghubungkan
                  profil anggota.
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    if (!singleForm.nik && !singleForm.nomor) {
                      setSuccessMessage("NIK atau No. Anggota wajib diisi.");
                      return;
                    }
                    try {
                      const res = await fetch("/api/anggota-ranting/import", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({
                          entries: [
                            {
                              nik: singleForm.nik || null,
                              nomor: singleForm.nomor || null,
                              nama: singleForm.nama || null,
                              ranting_id: rantingId,
                            },
                          ],
                        }),
                      });
                      if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        setSuccessMessage(
                          err?.message || "Gagal menyimpan data anggota.",
                        );
                        return;
                      }
                      const json = await res.json();
                      const first =
                        Array.isArray(json.entries) && json.entries.length > 0
                          ? json.entries[0]
                          : null;
                      const label =
                        first?.nama ||
                        singleForm.nama ||
                        singleForm.nomor ||
                        singleForm.nik ||
                        "baru";
                      setSuccessMessage(`Data anggota ${label} sudah tersimpan.`);
                      setSingleForm({ nik: "", nomor: "", nama: "" });
                      setShowSingleForm(false);
                      await loadData();
                    } catch {
                      setSuccessMessage("Gagal menyimpan data anggota.");
                    }
                  }}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        )}

        {showBulkForm && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70">
            <div className="w-full max-w-2xl rounded-xl border border-white/15 bg-zinc-950/95 p-5 text-xs text-white/80 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-white">
                  Tambah anggota (massal)
                </h2>
                <button
                  type="button"
                  onClick={() => setShowBulkForm(false)}
                  className="text-[11px] text-white/60 hover:text-white/90"
                >
                  Tutup
                </button>
              </div>
              <p className="text-[11px] text-white/55">
                Tempelkan data anggota dalam format baris per baris. Contoh:{" "}
                <code className="rounded bg-black/60 px-1 py-0.5">
                  NIK;NO_ANGGOTA;NAMA
                </code>
                . Setiap baris akan dihubungkan ke profil di ranting{" "}
                <span className="font-semibold">{rantingNamaParam}</span>.
              </p>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                rows={8}
                className="w-full rounded-md border border-white/20 bg-black/40 px-3 py-2 text-[11px] text-white placeholder:text-white/35 focus:border-emerald-400/80 focus:outline-none font-mono"
                placeholder={"3276xxxxxxxxxxxx;INKAI-0001;Nama Anggota 1\n3276xxxxxxxxxxxx;INKAI-0002;Nama Anggota 2"}
              />
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-white/50">
                  Nanti backend akan mem-parsing tiap baris dan membuat / mengupdate
                  profil beserta ranting_id.
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    const lines = bulkText
                      .split("\n")
                      .map((l) => l.trim())
                      .filter(Boolean);
                    if (lines.length === 0) {
                      setSuccessMessage("Tidak ada baris data untuk diproses.");
                      return;
                    }
                    const entries = lines
                      .map((line) => {
                        const [nik, nomor, nama] = line.split(";");
                        return {
                          nik: (nik || "").trim() || null,
                          nomor: (nomor || "").trim() || null,
                          nama: (nama || "").trim() || null,
                          ranting_id: rantingId,
                        };
                      })
                      .filter((e) => (e.nik || e.nomor) && e.nama);
                    if (entries.length === 0) {
                      setSuccessMessage(
                        "Format data tidak valid. Gunakan NIK;NO_ANGGOTA;NAMA.",
                      );
                      return;
                    }
                    try {
                      const res = await fetch("/api/anggota-ranting/import", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ entries }),
                      });
                      if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        setSuccessMessage(
                          err?.message || "Gagal memproses data anggota.",
                        );
                        return;
                      }
                      const json = await res.json();
                      const count =
                        Array.isArray(json.entries) && json.entries.length
                          ? json.entries.length
                          : entries.length;
                      setSuccessMessage(
                        `${count} data anggota sudah tersimpan untuk ranting ini.`,
                      );
                      setBulkText("");
                      setShowBulkForm(false);
                      await loadData();
                    } catch {
                      setSuccessMessage("Gagal memproses data anggota.");
                    }
                  }}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
                >
                  Proses data
                </button>
              </div>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70">
            <div className="w-full max-w-sm rounded-xl border border-emerald-500/40 bg-zinc-950/95 p-5 text-xs text-white/80 space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/60">
                  <span className="text-emerald-300 text-sm">✓</span>
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">Data tersimpan</h2>
                  <p className="text-[11px] text-emerald-100">{successMessage}</p>
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setSuccessMessage(null)}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

