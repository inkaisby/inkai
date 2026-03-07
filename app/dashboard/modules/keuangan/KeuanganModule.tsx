"use client";

import { useEffect, useState } from "react";
import { FileText, Printer } from "lucide-react";

type PaymentRow = {
  id: string;
  nama: string;
  nomor: string;
  jenis: string;
  event: string;
  ranting: string;
  nominal: number;
  tanggal: string;
  kwitansi_token: string | null;
};

type TahunOption = { id: string; nama: string };

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v);

export default function KeuanganModule() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [tahunList, setTahunList] = useState<TahunOption[]>([]);
  const [tahunId, setTahunId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [printingId, setPrintingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const url = tahunId
      ? `/api/keuangan/pembayaran?tahun_ajaran_id=${encodeURIComponent(tahunId)}`
      : "/api/keuangan/pembayaran";
    fetch(url, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setPayments(Array.isArray(data.list) ? data.list : []);
        setTahunList(Array.isArray(data.tahun_list) ? data.tahun_list : []);
      })
      .catch(() => {
        setPayments([]);
        setTahunList([]);
      })
      .finally(() => setLoading(false));
  }, [tahunId]);

  const handlePrintReceipt = async (row: PaymentRow) => {
    setPrintingId(row.id);
    try {
      let token = row.kwitansi_token ?? null;
      if (!token) {
        const ensureRes = await fetch(
          `/api/ukt/pendaftaran/${row.id}/ensure-kwitansi-token`,
          { method: "POST", credentials: "include" }
        );
        if (!ensureRes.ok) {
          alert("Gagal membuat token kwitansi");
          return;
        }
        const ensureData = await ensureRes.json();
        token = ensureData?.kwitansi_token ?? null;
        if (!token) {
          alert("Token kwitansi tidak tersedia");
          return;
        }
        setPayments((prev) =>
          prev.map((p) => (p.id === row.id ? { ...p, kwitansi_token: token } : p))
        );
      }
      const verifyRes = await fetch(
        `/api/kwitansi/verify?token=${encodeURIComponent(token!)}`,
        { credentials: "include" }
      );
      if (!verifyRes.ok) {
        alert("Data kwitansi tidak ditemukan");
        return;
      }
      const data = await verifyRes.json() as {
        no_kwitansi: string;
        nama: string;
        nomor: string;
        event: string;
        ranting: string;
        nominal: number;
        tanggal: string;
      };
      const printUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/dashboard/print/kwitansi?token=${encodeURIComponent(token!)}`
          : "";

      const [qrRes, { default: jsPDF }] = await Promise.all([
        fetch(`/api/qr?url=${encodeURIComponent(printUrl)}`, { credentials: "include" }),
        import("jspdf"),
      ]);
      if (!qrRes.ok) throw new Error("Gagal generate QR");
      const { dataUrl: qrDataUrl } = (await qrRes.json()) as { dataUrl: string };
      const doc = new jsPDF();
      const formatDate = (s: string) =>
        s
          ? new Date(s).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })
          : "";

      doc.setFontSize(14);
      doc.text("KWITANSI PEMBAYARAN", 20, 20);
      doc.setFontSize(10);
      doc.text(`No. ${data.no_kwitansi ?? ""}`, 20, 28);
      doc.text(`Tanggal: ${formatDate(data.tanggal ?? "")}`, 20, 34);
      doc.text(`Nama: ${data.nama ?? ""}`, 20, 42);
      doc.text(`No. Anggota: ${data.nomor ?? ""}`, 20, 48);
      doc.text(`Event: ${data.event ?? ""}`, 20, 54);
      doc.text(`Ranting: ${data.ranting ?? ""}`, 20, 60);
      doc.text(`Terbilang: ${formatCurrency(Number(data.nominal ?? 0))}`, 20, 68);
      doc.addImage(qrDataUrl, "PNG", 20, 78, 30, 30);
      doc.setFontSize(8);
      doc.text("Scan QR untuk cetak ulang", 52, 98);

      doc.save(`kwitansi-${(data.no_kwitansi ?? "ukt").replace(/\s/g, "-")}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Gagal membuat PDF kwitansi");
    } finally {
      setPrintingId(null);
    }
  };

  return (
    <div className="space-y-6 p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-teal-300" />
          <div>
            <h1 className="text-base font-semibold text-white">
              Kwitansi Pembayaran
            </h1>
            <p className="text-xs text-white/60">
              Data pembayaran lunas UKT. Cetak kwitansi dengan QR untuk verifikasi.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="text-xs font-medium text-white/60">Filter tahun ajaran</label>
        <select
          value={tahunId}
          onChange={(e) => setTahunId(e.target.value)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-teal-500/50 focus:outline-none focus:ring-1 focus:ring-teal-500/30"
        >
          <option value="">Semua tahun</option>
          {tahunList.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nama}
            </option>
          ))}
        </select>
      </div>

      <div className="border border-white/10 rounded-lg overflow-hidden bg-white/[0.02]">
        <table className="w-full text-[11px]">
          <thead className="bg-white/5">
            <tr className="text-white/60">
              <th className="px-3 py-2 text-left w-24">Tanggal</th>
              <th className="px-3 py-2 text-left">Nama</th>
              <th className="px-3 py-2 text-left">Event / Ranting</th>
              <th className="px-3 py-2 text-right w-24">Nominal</th>
              <th className="px-3 py-2 text-right w-24">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-white/50 text-xs">
                  Memuat…
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-white/5 hover:bg-white/[0.04]"
                >
                  <td className="px-3 py-2 text-white/60">
                    {p.tanggal
                      ? new Date(p.tanggal).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-white/90">
                    {p.nama}
                    {p.nomor ? (
                      <span className="ml-1 text-white/50">({p.nomor})</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-white/70">
                    {p.event}
                    {p.ranting ? ` — ${p.ranting}` : ""}
                  </td>
                  <td className="px-3 py-2 text-right text-amber-300">
                    {formatCurrency(p.nominal)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      disabled={printingId === p.id}
                      onClick={() => handlePrintReceipt(p)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border border-teal-500/60 text-teal-200 hover:bg-teal-500/10 disabled:opacity-50"
                    >
                      <Printer size={12} />
                      {printingId === p.id ? "…" : "Cetak"}
                    </button>
                  </td>
                </tr>
              ))
            )}
            {!loading && payments.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-3 text-center text-white/50 text-xs"
                >
                  Belum ada data pembayaran lunas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
