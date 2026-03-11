"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  renderKwitansiRantingPdf,
  getKwitansiRantingFilename,
  formatCurrency,
  fetchInkaiLogoDataUrl,
} from "@/components/kwitansi";
import type { KwitansiRantingData } from "@/components/kwitansi";
import { jsPDF } from "jspdf";

type TahunOption = { id: string; nama: string };
type RantingOption = { id: string; nama: string };

type KwitansiRantingApiResponse = {
  ranting_id: string;
  ranting_nama: string;
  tahun_ajaran_id: string;
  tahun_ajaran_nama: string;
  total_peserta: number;
  breakdown: Array<{
    key: string;
    label: string;
    jumlah: number;
    biayaSatuan: number;
    subtotal: number;
  }>;
  A: number;
  B: number;
  C: number;
  potongan_per_peserta: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function KwitansiRantingModal({ open, onClose }: Props) {
  const [tahunList, setTahunList] = useState<TahunOption[]>([]);
  const [rantingList, setRantingList] = useState<RantingOption[]>([]);
  const [tahunId, setTahunId] = useState("");
  const [rantingId, setRantingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<KwitansiRantingApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/ukt/tahun-ajaran", { credentials: "include" })
      .then((r) => r.json())
      .then((arr) => {
        const list = Array.isArray(arr) ? arr : [];
        setTahunList(list);
        if (list.length > 0) setTahunId((prev) => prev || list[0].id);
      })
      .catch(() => setTahunList([]));
    fetch("/api/ranting", { credentials: "include" })
      .then((r) => r.json())
      .then((arr) => {
        const list = Array.isArray(arr) ? arr : [];
        setRantingList(list);
        if (list.length > 0) setRantingId((prev) => prev || list[0].id);
      })
      .catch(() => setRantingList([]));
  }, [open]);

  const fetchData = useCallback(() => {
    if (!tahunId || !rantingId) {
      setData(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    setData(null);
    fetch(
      `/api/ukt/kwitansi-ranting?tahun_ajaran_id=${encodeURIComponent(tahunId)}&ranting_id=${encodeURIComponent(rantingId)}`,
      { credentials: "include" }
    )
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? "Data tidak ditemukan" : "Gagal memuat data");
        return r.json();
      })
      .then((json) => setData(json))
      .catch((e) => setError(e.message || "Gagal memuat data"))
      .finally(() => setLoading(false));
  }, [tahunId, rantingId]);

  useEffect(() => {
    if (tahunId && rantingId && open) fetchData();
    else setData(null);
  }, [tahunId, rantingId, open, fetchData]);

  const handleCetak = useCallback(async () => {
    if (!data || !tahunId || !rantingId) return;
    setPrinting(true);
    try {
      const ensureRes = await fetch("/api/ukt/kwitansi-ranting/ensure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          tahun_ajaran_id: tahunId,
          ranting_id: rantingId,
        }),
      });
      const ensureData = await ensureRes.json().catch(() => null);
      if (!ensureRes.ok || !ensureData?.token) {
        alert("Gagal membuat token kwitansi. Coba lagi.");
        return;
      }
      const printUrlFull =
        typeof window !== "undefined"
          ? `${window.location.origin}/kwitansi-ranting?token=${encodeURIComponent(ensureData.token)}`
          : "";
      const [qrRes, logoDataUrl] = await Promise.all([
        fetch(`/api/qr?url=${encodeURIComponent(printUrlFull)}`, {
          credentials: "include",
        }),
        fetchInkaiLogoDataUrl(),
      ]);
      const qrData = await qrRes.json().catch(() => null);
      const qrDataUrl = qrRes.ok && qrData?.dataUrl ? qrData.dataUrl : undefined;

      const kwitansiData: KwitansiRantingData = {
        no_kwitansi: ensureData.no_kwitansi ?? `UKT-R-${data.ranting_id.slice(0, 8).toUpperCase()}`,
        ranting_nama: data.ranting_nama,
        jenis: "Ujian Kenaikan Tingkat (UKT)",
        event: data.tahun_ajaran_nama,
        total_peserta: data.total_peserta,
        potongan_per_peserta: data.potongan_per_peserta,
        A: data.A,
        B: data.B,
        C: data.C,
        tanggal: new Date().toISOString(),
        breakdown: data.breakdown,
      };
      const doc = new jsPDF();
      renderKwitansiRantingPdf(doc, kwitansiData, qrDataUrl, logoDataUrl);
      doc.autoPrint();
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank");
      if (win) {
        setTimeout(() => {
          try {
            win.print();
          } catch {
            /* ignore */
          }
          setTimeout(() => URL.revokeObjectURL(url), 2000);
        }, 500);
      } else {
        doc.save(getKwitansiRantingFilename(kwitansiData));
      }
    } catch (e) {
      console.error(e);
      alert("Gagal mencetak");
    } finally {
      setPrinting(false);
    }
  }, [data, tahunId, rantingId]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-white/10 bg-zinc-900 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-semibold text-zinc-100">
            <FileText className="h-5 w-5 text-teal-400/90" />
            Kwitansi per Ranting
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-xs text-zinc-500">
          Pilih tahun ajaran dan ranting. A = total biaya tiap kyu, B = potongan
          Rp 50.000 per peserta, C = A − B.
        </p>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Tahun ajaran
            </label>
            <Select value={tahunId} onValueChange={setTahunId}>
              <SelectTrigger className="w-full border-white/10 bg-white/5 text-zinc-200">
                <SelectValue placeholder="Pilih tahun ajaran" />
              </SelectTrigger>
              <SelectContent>
                {tahunList.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Ranting
            </label>
            <Select value={rantingId} onValueChange={setRantingId}>
              <SelectTrigger className="w-full border-white/10 bg-white/5 text-zinc-200">
                <SelectValue placeholder="Pilih ranting" />
              </SelectTrigger>
              <SelectContent>
                {rantingList.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading && (
          <p className="mt-4 text-sm text-zinc-500">Memuat data…</p>
        )}
        {error && (
          <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}
        {data && !loading && (
          <div className="mt-6 space-y-3 rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm text-zinc-500">
              {data.ranting_nama} — {data.tahun_ajaran_nama}
            </p>
            <p className="text-sm text-zinc-400">
              Total peserta: <strong className="text-zinc-200">{data.total_peserta}</strong>
            </p>
            {data.breakdown && data.breakdown.length > 0 && (
              <div className="overflow-x-auto rounded border border-white/10">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02] text-left text-zinc-400">
                      <th className="px-4 py-2">Kyu/Dan</th>
                      <th className="px-4 py-2 text-right">Jumlah</th>
                      <th className="px-4 py-2 text-right">Biaya</th>
                      <th className="px-4 py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.breakdown.map((r) => (
                      <tr key={r.key} className="border-b border-white/5">
                        <td className="px-4 py-2 text-zinc-300">{r.label}</td>
                        <td className="px-4 py-2 text-right text-zinc-400">
                          {r.jumlah}
                        </td>
                        <td className="px-4 py-2 text-right text-zinc-400">
                          {formatCurrency(r.biayaSatuan)}
                        </td>
                        <td className="px-4 py-2 text-right text-zinc-300">
                          {formatCurrency(r.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="space-y-1 pt-2 text-sm">
              <p>
                <span className="text-zinc-500">A = Total biaya tiap kyu:</span>{" "}
                <strong className="text-teal-400">{formatCurrency(data.A)}</strong>
              </p>
              <p>
                <span className="text-zinc-500">B = Potongan:</span>{" "}
                <strong className="text-amber-400">{formatCurrency(data.B)}</strong>
              </p>
              <p>
                <span className="text-zinc-500">C = Nominal yang harus dibayar ranting (A − B):</span>{" "}
                <strong className="text-emerald-400">{formatCurrency(data.C)}</strong>
              </p>
            </div>
            <button
              type="button"
              disabled={printing}
              onClick={handleCetak}
              className="mt-3 w-full rounded-lg bg-teal-600/90 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-50"
            >
              {printing ? "Membuka cetak…" : "Cetak"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
