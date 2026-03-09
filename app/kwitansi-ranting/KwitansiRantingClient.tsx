"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Download } from "lucide-react";
import {
  KwitansiRantingTemplate,
  renderKwitansiRantingPdf,
  getKwitansiRantingFilename,
  fetchInkaiLogoDataUrl,
} from "@/components/kwitansi";
import type { KwitansiRantingData } from "@/components/kwitansi";

export default function KwitansiRantingClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [data, setData] = useState<KwitansiRantingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [printUrl, setPrintUrl] = useState<string>("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!token) {
      queueMicrotask(() => {
        setError("Token tidak ada. Buka link cetak kwitansi per ranting dari UKT.");
        setLoading(false);
      });
      return;
    }
    fetch(`/api/ukt/kwitansi-ranting/verify?token=${encodeURIComponent(token)}`, {
      credentials: "include",
    })
      .then((r) => {
        if (!r.ok) throw new Error("Kwitansi tidak ditemukan");
        return r.json();
      })
      .then(setData)
      .catch(() => setError("Kwitansi ranting tidak ditemukan atau token tidak valid."))
      .finally(() => setLoading(false));

    if (typeof window !== "undefined") {
      queueMicrotask(() => {
        setPrintUrl(
          `${window.location.origin}/kwitansi-ranting?token=${encodeURIComponent(token)}`,
        );
      });
    }
  }, [token]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleDownloadPdf = useCallback(async () => {
    if (!data || !printUrl) return;
    setDownloading(true);
    try {
      const [qrRes, logoDataUrl, { default: jsPDF }] = await Promise.all([
        fetch(`/api/qr?url=${encodeURIComponent(printUrl)}`, {
          credentials: "include",
        }),
        fetchInkaiLogoDataUrl(),
        import("jspdf"),
      ]);
      if (!qrRes.ok) throw new Error("Gagal generate QR");
      const { dataUrl: qrDataUrl } = (await qrRes.json()) as { dataUrl: string };
      const doc = new jsPDF();
      renderKwitansiRantingPdf(doc, data, qrDataUrl, logoDataUrl);
      doc.save(getKwitansiRantingFilename(data));
    } catch {
      setError("Gagal membuat PDF. Silakan coba lagi atau gunakan Cetak / Print.");
    } finally {
      setDownloading(false);
    }
  }, [data, printUrl]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-8 text-center text-slate-600">
        Memuat kwitansi…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-white p-8 text-center">
        <p className="text-red-600">{error ?? "Data tidak ditemukan"}</p>
        <Link
          href="/dashboard/ukt"
          className="mt-4 inline-flex items-center gap-2 text-sm text-slate-600 underline hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Ke UKT
        </Link>
      </div>
    );
  }

  return (
    <KwitansiRantingTemplate
      data={data}
      printUrl={printUrl}
      actionsSlot={
        <>
          <Link
            href="/dashboard/ukt"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke UKT
          </Link>
          <button
            type="button"
            onClick={handlePrint}
            className="rounded-lg bg-teal-600 px-6 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            Cetak / Print
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {downloading ? "Membuat…" : "Unduh PDF"}
          </button>
        </>
      }
    />
  );
}
