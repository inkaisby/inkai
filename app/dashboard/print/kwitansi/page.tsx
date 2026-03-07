"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

type KwitansiData = {
  id: string;
  token: string;
  no_kwitansi: string;
  nama: string;
  nomor: string;
  jenis: string;
  event: string;
  ranting: string;
  nominal: number;
  tanggal: string;
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);

export default function PrintKwitansiPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [data, setData] = useState<KwitansiData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [printUrl, setPrintUrl] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setError("Token tidak ada");
      setLoading(false);
      return;
    }
    fetch(`/api/kwitansi/verify?token=${encodeURIComponent(token)}`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Kwitansi tidak ditemukan");
        return r.json();
      })
      .then(setData)
      .catch(() => setError("Kwitansi tidak ditemukan"))
      .finally(() => setLoading(false));

    if (typeof window !== "undefined") {
      setPrintUrl(`${window.location.origin}/dashboard/print/kwitansi?token=${encodeURIComponent(token)}`);
    }
  }, [token]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-8 text-center text-slate-600">
        Memuat kwitansi…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-white p-8 text-center text-red-600">
        {error ?? "Data tidak ditemukan"}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-8 print:p-4">
      <div className="mx-auto max-w-lg">
        <h1 className="text-lg font-bold text-slate-900">KWITANSI PEMBAYARAN</h1>
        <p className="mt-2 text-sm text-slate-600">No. {data.no_kwitansi}</p>
        <p className="text-sm text-slate-600">
          Tanggal:{" "}
          {data.tanggal
            ? new Date(data.tanggal).toLocaleDateString("id-ID", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "—"}
        </p>
        <div className="mt-6 space-y-1 text-sm text-slate-800">
          <p>Sudah terima dari : <strong>{data.nama}</strong></p>
          {data.nomor && <p>No. Anggota : {data.nomor}</p>}
          <p>Ranting : {data.ranting}</p>
          <p>Untuk pembayaran : {data.jenis} — {data.event}</p>
          <p>Sejumlah : <strong>{formatCurrency(data.nominal)}</strong></p>
        </div>
        <div className="mt-8 flex justify-between">
          <div>
            <p className="text-xs text-slate-500">Scan QR untuk cetak ulang</p>
            {printUrl && (
              <div className="mt-2 inline-block border border-slate-200 p-2">
                <QRCodeSVG value={printUrl} size={100} level="M" />
              </div>
            )}
          </div>
          <p className="text-right text-sm text-slate-600">
            Petugas,<br />
            <span className="mt-4 inline-block border-b border-slate-400 w-32" />
          </p>
        </div>
      </div>
      <div className="mt-8 flex justify-center print:hidden">
        <button
          type="button"
          onClick={handlePrint}
          className="rounded-lg bg-teal-600 px-6 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          Cetak / Print
        </button>
      </div>
    </div>
  );
}
