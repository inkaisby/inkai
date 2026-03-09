"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, QrCode } from "lucide-react";

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats: string[] }) => {
      detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
    };
  }
}

/** Ambil token dari URL kwitansi (relative atau absolut). */
function extractKwitansiUrl(text: string): string | null {
  const s = (text ?? "").trim();
  if (!s) return null;
  if (s.startsWith("http://") || s.startsWith("https://")) {
    if (s.includes("kwitansi") && s.includes("token=")) return s;
    return null;
  }
  if (s.includes("kwitansi") && s.includes("token=")) {
    if (typeof window !== "undefined")
      return `${window.location.origin}${s.startsWith("/") ? s : `/${s}`}`;
    return s;
  }
  return null;
}

export default function ScanKwitansiPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pasteUrl, setPasteUrl] = useState("");
  const [noKwitansi, setNoKwitansi] = useState("");
  const [nominal, setNominal] = useState("");
  const [loadingNo, setLoadingNo] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [loadingToken, setLoadingToken] = useState(false);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);

  const openKwitansiUrl = useCallback((url: string) => {
    window.location.href = url;
  }, []);

  const openByToken = useCallback(
    (token: string) => {
      if (typeof window !== "undefined")
        openKwitansiUrl(`${window.location.origin}/kwitansi?token=${encodeURIComponent(token)}`);
    },
    [openKwitansiUrl]
  );

  useEffect(() => {
    const hasBarcodeDetector =
      typeof window !== "undefined" && "BarcodeDetector" in window;
    setSupported(hasBarcodeDetector);
  }, []);

  useEffect(() => {
    if (supported !== true || !videoRef.current) return;

    let cancelled = false;
    let rafId = 0;
    const video = videoRef.current;

    const run = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        video.srcObject = stream;
        await video.play();

        const BarcodeDetector = (window as Window).BarcodeDetector;
        if (!BarcodeDetector) return;
        const detector = new BarcodeDetector({ formats: ["qr_code"] });

        const detect = async () => {
          if (cancelled || !video.videoWidth) {
            rafId = requestAnimationFrame(detect);
            return;
          }
          try {
            const barcodes = await detector.detect(video);
            const first = barcodes?.[0]?.rawValue;
            if (first) {
              const url = extractKwitansiUrl(first);
              if (url) {
                setScanSuccess(url);
                stream.getTracks().forEach((t) => t.stop());
                streamRef.current = null;
                openKwitansiUrl(url);
                return;
              }
            }
          } catch {
            // ignore single-frame errors
          }
          rafId = requestAnimationFrame(detect);
        };
        rafId = requestAnimationFrame(detect);
      } catch (e) {
        if (!cancelled)
          setError(
            "Akses kamera ditolak atau tidak tersedia. Gunakan kolom tempel link di bawah."
          );
      }
    };

    run();
    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [supported, openKwitansiUrl]);

  const handlePasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const url = extractKwitansiUrl(pasteUrl);
    if (url) openKwitansiUrl(url);
    else setError("Link tidak valid. Harus berisi kwitansi dan token.");
  };

  const handleNoKwitansiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const no = (noKwitansi ?? "").trim();
    if (!no) {
      setError("No. kwitansi wajib diisi.");
      return;
    }
    const nominalRaw = (nominal ?? "").trim();
    const nominalNumber =
      nominalRaw.length > 0
        ? Number(String(nominalRaw).replace(/[^\d]/g, ""))
        : null;
    if (nominalRaw.length > 0 && (!nominalNumber || Number.isNaN(nominalNumber) || nominalNumber <= 0)) {
      setError("Nominal tidak valid. Contoh: 345000");
      return;
    }
    setLoadingNo(true);
    try {
      const params = new URLSearchParams({ no });
      if (nominalNumber != null) params.set("nominal", String(nominalNumber));
      const res = await fetch(`/api/kwitansi/by-number?${params.toString()}`, {
        credentials: "include",
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((j.message as string) || "Kwitansi tidak ditemukan.");
        return;
      }
      const token = j.token;
      if (token) openByToken(token);
      else setError("Kwitansi tidak ditemukan.");
    } finally {
      setLoadingNo(false);
    }
  };

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const token = (tokenInput ?? "").trim();
    if (!token) {
      setError("Token wajib diisi.");
      return;
    }
    // Validasi ringan: UUID format umum (tetap izinkan jika beda, tapi ini bantu typo)
    const looksLikeUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token);
    if (!looksLikeUuid && token.length < 20) {
      setError("Token terlihat tidak valid. Pastikan token lengkap.");
      return;
    }
    setLoadingToken(true);
    try {
      openByToken(token);
    } finally {
      setLoadingToken(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6 rounded-xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/ukt"
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Ke UKT
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <QrCode className="h-6 w-6 text-teal-400/90" />
        <h1 className="text-lg font-semibold text-zinc-100">
          Scan QR Kwitansi
        </h1>
      </div>
      <p className="text-sm text-zinc-500">
        Arahkan kamera ke QR code di kwitansi. Data akan terbaca dan halaman
        kwitansi terbuka — bendahara atau user tinggal print.
      </p>

      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      {supported === true && (
        <div className="overflow-hidden rounded-lg border border-white/10 bg-black/40">
          <video
            ref={videoRef}
            playsInline
            muted
            className="h-[280px] w-full object-cover"
          />
          {scanSuccess && (
            <div className="bg-teal-500/10 px-3 py-2 text-center text-sm text-teal-300">
              Membuka kwitansi…
            </div>
          )}
        </div>
      )}

      {supported === false && (
        <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-200/90">
          Browser ini tidak mendukung scan kamera. Gunakan kolom tempel link di
          bawah atau buka link kwitansi langsung dari ponsel (scan dengan aplikasi
          kamera/pemindai QR).
        </p>
      )}

      <form onSubmit={handleNoKwitansiSubmit} className="space-y-2">
        <label className="block text-xs font-medium text-zinc-400">
          Cari dengan No. Kwitansi (jika QR/URL bermasalah)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={noKwitansi}
            onChange={(e) => {
              setNoKwitansi(e.target.value);
              setError(null);
            }}
            placeholder="UKT-A23F0323"
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-teal-500/50 focus:outline-none focus:ring-1 focus:ring-teal-500/30"
          />
          <input
            type="text"
            inputMode="numeric"
            value={nominal}
            onChange={(e) => {
              setNominal(e.target.value);
              setError(null);
            }}
            placeholder="Nominal (opsional)"
            className="w-[150px] rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-teal-500/50 focus:outline-none focus:ring-1 focus:ring-teal-500/30"
          />
          <button
            type="submit"
            disabled={loadingNo}
            className="rounded-lg bg-teal-600/90 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-50"
          >
            {loadingNo ? "…" : "Buka"}
          </button>
        </div>
        <p className="text-[11px] text-zinc-500">
          Tips: isi <span className="text-zinc-300">Nominal</span> untuk verifikasi tambahan (lebih aman).
        </p>
      </form>

      <form onSubmit={handleTokenSubmit} className="space-y-2">
        <label className="block text-xs font-medium text-zinc-400">
          Atau buka dengan Token (fallback cepat)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={tokenInput}
            onChange={(e) => {
              setTokenInput(e.target.value);
              setError(null);
            }}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-teal-500/50 focus:outline-none focus:ring-1 focus:ring-teal-500/30"
          />
          <button
            type="submit"
            disabled={loadingToken}
            className="rounded-lg bg-teal-600/90 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-50"
          >
            {loadingToken ? "…" : "Buka"}
          </button>
        </div>
      </form>

      <form onSubmit={handlePasteSubmit} className="space-y-2">
        <label className="block text-xs font-medium text-zinc-400">
          Atau tempel link kwitansi
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={pasteUrl}
            onChange={(e) => {
              setPasteUrl(e.target.value);
              setError(null);
            }}
            placeholder="https://.../kwitansi?token=..."
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-teal-500/50 focus:outline-none focus:ring-1 focus:ring-teal-500/30"
          />
          <button
            type="submit"
            className="rounded-lg bg-teal-600/90 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500"
          >
            Buka
          </button>
        </div>
      </form>
    </div>
  );
}
