"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { KwitansiTemplate } from "@/components/kwitansi";
import type { KwitansiData } from "@/components/kwitansi";

export default function PrintKwitansiPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [data, setData] = useState<KwitansiData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [printUrl, setPrintUrl] = useState<string>("");

  useEffect(() => {
    if (token && typeof window !== "undefined") {
      window.location.replace(`/kwitansi?token=${encodeURIComponent(token)}`);
      return;
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      queueMicrotask(() => {
        setError("Token tidak ada");
        setLoading(false);
      });
      return;
    }
    fetch(`/api/kwitansi/verify?token=${encodeURIComponent(token)}`, {
      credentials: "include",
    })
      .then((r) => {
        if (!r.ok) throw new Error("Kwitansi tidak ditemukan");
        return r.json();
      })
      .then(setData)
      .catch(() => setError("Kwitansi tidak ditemukan"))
      .finally(() => setLoading(false));

    if (typeof window !== "undefined") {
      queueMicrotask(() => {
        setPrintUrl(
          `${window.location.origin}/kwitansi?token=${encodeURIComponent(token)}`,
        );
      });
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
    <KwitansiTemplate
      data={data}
      printUrl={printUrl}
      actionsSlot={
        <>
          <Link
            href="/dashboard/ukt"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Link>
          <button
            type="button"
            onClick={handlePrint}
            className="rounded-lg bg-teal-600 px-6 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            Cetak / Print
          </button>
        </>
      }
    />
  );
}
