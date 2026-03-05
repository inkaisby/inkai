"use client";

import { useEffect, useRef, useState } from "react";
import JarvisLoader from "@/components/JarvisLoader";

type TahunAjaran = { id: string; nama: string; tahun: number; periode: string };
type RantingOption = { id: string; nama: string };
type PendaftaranItem = {
  id: string;
  profile_id: string;
  nama: string;
  nomor: string;
  kyu_dan_terakhir: string;
  status_bayar: string;
  total_bayar: number | null;
  bukti_transfer_path: string | null;
  file_url: string | null;
  dikonfirmasi_at: string | null;
};
type ResumeData = {
  list: PendaftaranItem[];
  summary: { total: number; belum_bayar: number; lunas: number; total_bayar: number };
};

type Props = {
  tahunId: string;
  rantingId: string;
  resumeVersion: number;
};

export default function ResumeUKT({ tahunId, rantingId, resumeVersion }: Props) {
  const [tahunList, setTahunList] = useState<TahunAjaran[]>([]);
  const [rantingList, setRantingList] = useState<RantingOption[]>([]);
  const [data, setData] = useState<ResumeData | null>(null);
  const [loadingResume, setLoadingResume] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    fetch("/api/ukt/tahun-ajaran", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setTahunList(Array.isArray(d) ? d : []))
      .catch(() => setTahunList([]));
  }, []);

  useEffect(() => {
    fetch("/api/ranting", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setRantingList(Array.isArray(d) ? d : []))
      .catch(() => setRantingList([]));
  }, []);

  useEffect(() => {
    if (!tahunId || !rantingId) {
      setData(null);
      return;
    }
    setLoadingResume(true);
    fetch(
      `/api/ukt/pendaftaran?tahun_ajaran_id=${encodeURIComponent(tahunId)}&ranting_id=${encodeURIComponent(rantingId)}`,
      { credentials: "include" }
    )
      .then((r) => r.json())
      .then((d) => {
        if (d.list && d.summary) setData(d);
        else setData(null);
      })
      .catch(() => setData(null))
      .finally(() => setLoadingResume(false));
  }, [tahunId, rantingId, resumeVersion]);

  const refetchResume = () => {
    if (!tahunId || !rantingId) return;
    setLoadingResume(true);
    fetch(
      `/api/ukt/pendaftaran?tahun_ajaran_id=${encodeURIComponent(tahunId)}&ranting_id=${encodeURIComponent(rantingId)}`,
      { credentials: "include" }
    )
      .then((r) => r.json())
      .then((d) => (d.list && d.summary ? setData(d) : setData(null)))
      .finally(() => setLoadingResume(false));
  };

  const handleUploadBukti = async (id: string, file: File) => {
    setUploadingId(id);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch(`/api/ukt/pendaftaran/${id}/upload`, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.message || "Gagal upload bukti");
        return;
      }
      refetchResume();
    } finally {
      setUploadingId(null);
    }
  };

  const handleKonfirmasiLunas = async (id: string) => {
    if (!confirm("Konfirmasi status lunas untuk peserta ini?")) return;
    const res = await fetch(`/api/ukt/pendaftaran/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status_bayar: "lunas" }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j.message || "Gagal konfirmasi");
      return;
    }
    refetchResume();
  };

  const rantingNama = rantingList.find((r) => r.id === rantingId)?.nama ?? "—";
  const tahunNama = tahunList.find((t) => t.id === tahunId)?.nama ?? "—";

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-zinc-100">Laporan Pendaftaran UKT</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Ringkasan peserta untuk tahun & ranting yang dipilih di kolom kiri; upload bukti & konfirmasi lunas.
        </p>
      </div>

      {!tahunId || !rantingId ? (
        <p className="text-sm text-zinc-500">
          Pilih tahun ajaran dan ranting di kolom Pendaftaran (kiri) untuk menampilkan laporan.
        </p>
      ) : loadingResume ? (
        <div className="mt-6"><JarvisLoader label="Memuat resume…" /></div>
      ) : data ? (
        <>
          <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.02] p-4">
            <h3 className="text-sm font-medium text-zinc-200">
              Ranting: {rantingNama} — Tahun Ajaran: {tahunNama}
            </h3>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-zinc-400">
              <span>Total peserta: {data.summary.total}</span>
              <span>Belum bayar: {data.summary.belum_bayar}</span>
              <span>Lunas: {data.summary.lunas}</span>
              {data.summary.total_bayar > 0 && (
                <span>Total bayar: Rp {data.summary.total_bayar.toLocaleString("id-ID")}</span>
              )}
            </div>
          </div>

          <div className="mt-6 overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-left text-zinc-400">
                  <th className="px-4 py-3">Peserta</th>
                  <th className="px-4 py-3">No. Anggota</th>
                  <th className="px-4 py-3">Kyu/Dan</th>
                  <th className="px-4 py-3">Status Bayar</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Bukti</th>
                  <th className="px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.list.map((r) => (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-zinc-200">{r.nama}</td>
                    <td className="px-4 py-3 text-zinc-400">{r.nomor}</td>
                    <td className="px-4 py-3 text-zinc-400">{r.kyu_dan_terakhir}</td>
                    <td className="px-4 py-3">
                      {r.status_bayar === "lunas" ? (
                        <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400/90">
                          Lunas
                        </span>
                      ) : r.status_bayar === "bukti_uploaded" ? (
                        <span className="text-zinc-500 text-xs">Bukti diupload</span>
                      ) : (
                        <span className="text-zinc-500 text-xs">Menunggu bayar</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {r.total_bayar != null
                        ? "Rp " + Number(r.total_bayar).toLocaleString("id-ID")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {r.file_url ? (
                        <a
                          href={r.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-400/90 text-xs underline hover:text-amber-300/90"
                        >
                          Lihat bukti
                        </a>
                      ) : r.status_bayar !== "lunas" ? (
                        <span className="flex items-center gap-1">
                          <input
                            ref={(el) => { fileInputRefs.current[r.id] = el; }}
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleUploadBukti(r.id, f);
                              e.target.value = "";
                            }}
                          />
                          <button
                            type="button"
                            disabled={uploadingId === r.id}
                            onClick={() => fileInputRefs.current[r.id]?.click()}
                            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-zinc-400 hover:bg-white/10 disabled:opacity-50"
                          >
                            {uploadingId === r.id ? "Mengunggah…" : "Upload bukti"}
                          </button>
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.status_bayar !== "lunas" && (
                        <button
                          type="button"
                          onClick={() => handleKonfirmasiLunas(r.id)}
                          className="rounded-md bg-emerald-600/80 px-2 py-1 text-xs text-white hover:bg-emerald-500/80"
                        >
                          Konfirmasi Lunas
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.list.length === 0 && (
            <p className="mt-4 text-sm text-zinc-500">Belum ada peserta terdaftar untuk kombinasi ini.</p>
          )}
        </>
      ) : (
        <p className="mt-6 text-sm text-zinc-500">Tidak ada data.</p>
      )}
    </div>
  );
}
