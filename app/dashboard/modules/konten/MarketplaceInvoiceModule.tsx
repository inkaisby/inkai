"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Package, Printer, ReceiptText } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL } from "@/app/lib/marketplaceOrderLabels";
import { digitsFromPriceString, formatRupiahFromDigits } from "@/app/lib/formatRupiah";

type InvoiceItem = {
  product_id: string;
  title: string;
  price: string;
  qty: number;
  href: string;
};

type Invoice = {
  id: string;
  created_at: string;
  status: string;
  customer_name: string;
  customer_phone: string;
  shipping_address: string | null;
  payment_method: string | null;
  notes: string | null;
  items: InvoiceItem[];
  seller_name: string;
};

function fmtIdShort(id: string) {
  const s = String(id || "");
  return s.length > 12 ? `${s.slice(0, 8)}…${s.slice(-4)}` : s;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" });
}

function totalOf(items: InvoiceItem[]): string {
  const t = items.reduce(
    (a, it) => a + BigInt(digitsFromPriceString(it.price) || "0") * BigInt(it.qty),
    BigInt(0),
  );
  return formatRupiahFromDigits(t.toString());
}

export default function MarketplaceInvoiceModule({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [inv, setInv] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [paper, setPaper] = useState<"a4" | "f4">("a4");
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const invoiceUrl = useMemo(
    () => (origin && orderId ? `${origin}/dashboard/marketplace/nota?order=${encodeURIComponent(orderId)}` : ""),
    [origin, orderId],
  );

  const canLoad = useMemo(() => typeof orderId === "string" && orderId.trim().length > 0, [orderId]);

  useEffect(() => {
    if (!canLoad) return;
    let c = false;
    const t = setTimeout(() => {
      if (!c) setLoading(true);
    }, 0);
    fetch(`/api/home/marketplace/orders/${encodeURIComponent(orderId)}/invoice`, {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { invoice?: Invoice } | null) => {
        if (!c) setInv(d?.invoice ?? null);
      })
      .finally(() => {
        if (!c) setLoading(false);
      });
    return () => {
      c = true;
      clearTimeout(t);
    };
  }, [canLoad, orderId]);

  const printNow = (p: "a4" | "f4") => {
    setPaper(p);
    // allow state flush
    setTimeout(() => window.print(), 60);
  };

  if (!canLoad) {
    return (
      <div className="space-y-4 pb-10 max-w-xl">
        <h1 className="text-xl font-semibold text-white flex items-center gap-2">
          <ReceiptText className="w-5 h-5 text-teal-300" />
          Nota
        </h1>
        <p className="text-sm text-white/55">
          ID pesanan tidak ditemukan. Buka dari halaman Pesanan saya.
        </p>
        <Link href="/dashboard/marketplace/pesanan" className="text-teal-400 text-sm">
          ← Kembali ke Pesanan saya
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-10">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <div className="no-print flex items-start justify-between gap-3 flex-wrap mb-5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-white/65 hover:text-teal-300"
          >
            ← Kembali
          </button>
          <span className="text-white/25">|</span>
          <Link href="/dashboard/marketplace/pesanan" className="text-sm text-teal-400 hover:text-teal-300">
            Pesanan saya
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => printNow("a4")}
            className="inline-flex items-center gap-2 rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm text-white/85 hover:bg-white/10"
          >
            <Printer className="w-4 h-4" /> Cetak A4
          </button>
          <button
            type="button"
            onClick={() => printNow("f4")}
            className="inline-flex items-center gap-2 rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm text-white/85 hover:bg-white/10"
          >
            <Printer className="w-4 h-4" /> Cetak F4
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-white/55">Memuat nota…</p>
      ) : !inv ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center max-w-xl">
          <Package className="w-10 h-10 mx-auto text-white/20 mb-2" />
          <p className="text-white/55 text-sm">Nota tidak ditemukan.</p>
          <Link href="/dashboard/marketplace/pesanan" className="inline-block mt-3 text-teal-400 text-sm">
            Kembali ke Pesanan saya
          </Link>
        </div>
      ) : (
        <div
          className={`mx-auto bg-white text-black rounded-xl shadow-[0_24px_90px_rgba(0,0,0,0.55)] overflow-hidden ${
            paper === "f4" ? "max-w-[840px]" : "max-w-[800px]"
          }`}
        >
          <div className="px-8 py-7 border-b border-black/10">
            <div className="flex items-start justify-between gap-6">
              <div>
                <div className="text-[13px] uppercase tracking-wider text-black/60">
                  INKAI Marketplace
                </div>
                <h1 className="text-2xl font-bold mt-1">NOTA</h1>
                <div className="text-sm text-black/70 mt-2">
                  Kode transaksi: <span className="font-semibold">{fmtIdShort(inv.id)}</span>
                </div>
                <div className="text-sm text-black/70">
                  Tanggal: <span className="font-semibold">{fmtDate(inv.created_at)} WIB</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-black/60">Status</div>
                <div className="inline-flex mt-1 rounded-full px-3 py-1 text-sm font-semibold bg-black/5 border border-black/10">
                  {ORDER_STATUS_LABEL[inv.status] ?? inv.status}
                </div>
                {invoiceUrl ? (
                  <div className="mt-3 inline-flex flex-col items-end gap-1">
                    <div className="bg-white p-2 rounded-lg border border-black/10">
                      <QRCodeSVG value={invoiceUrl} size={96} />
                    </div>
                    <div className="text-[11px] text-black/50">Scan untuk buka nota</div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="px-8 py-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div className="text-xs font-semibold text-black/60 uppercase tracking-wide">
                Penjual
              </div>
              <div className="mt-1 text-base font-semibold">{inv.seller_name}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-black/60 uppercase tracking-wide">
                Pembeli
              </div>
              <div className="mt-1 text-base font-semibold">{inv.customer_name}</div>
              <div className="text-sm text-black/70">{inv.customer_phone}</div>
              {inv.shipping_address ? (
                <div className="text-sm text-black/70 mt-1">{inv.shipping_address}</div>
              ) : null}
            </div>
          </div>

          <div className="px-8 pb-7">
            <div className="rounded-lg border border-black/10 overflow-hidden">
              <div className="grid grid-cols-[48px_1fr_84px_120px_120px] bg-black/[0.03] text-sm font-semibold px-4 py-3">
                <div>No.</div>
                <div>Nama Barang</div>
                <div className="text-right">Qty</div>
                <div className="text-right">Harga</div>
                <div className="text-right">Jumlah</div>
              </div>
              {inv.items.map((it, idx) => {
                const jumlah = formatRupiahFromDigits(
                  (BigInt(digitsFromPriceString(it.price) || "0") * BigInt(it.qty)).toString(),
                );
                return (
                  <div
                    key={`${it.product_id}-${idx}`}
                    className="grid grid-cols-[48px_1fr_84px_120px_120px] px-4 py-3 text-sm border-t border-black/10"
                  >
                    <div className="text-black/70">{idx + 1}</div>
                    <div className="font-medium">{it.title}</div>
                    <div className="text-right">{it.qty}</div>
                    <div className="text-right">{formatRupiahFromDigits(digitsFromPriceString(it.price) || "0")}</div>
                    <div className="text-right font-semibold">{jumlah}</div>
                  </div>
                );
              })}
              <div className="border-t border-black/10 px-4 py-3 text-sm">
                <div className="flex justify-end gap-6">
                  <div className="text-black/60">Total Belanja</div>
                  <div className="w-[120px] text-right font-bold">{totalOf(inv.items)}</div>
                </div>
                <div className="flex justify-end gap-6 mt-1">
                  <div className="text-black/60">Metode bayar</div>
                  <div className="w-[120px] text-right">
                    {PAYMENT_METHOD_LABEL[inv.payment_method ?? ""] ?? inv.payment_method ?? "—"}
                  </div>
                </div>
              </div>
            </div>

            {inv.notes ? (
              <div className="mt-5 text-sm">
                <div className="text-xs font-semibold text-black/60 uppercase tracking-wide">
                  Catatan
                </div>
                <div className="mt-1 text-black/80 whitespace-pre-wrap">{inv.notes}</div>
              </div>
            ) : null}

            <div className="mt-7 text-sm text-black/60 flex items-center justify-between gap-4">
              <div>
                Bukti pesanan ini dibuat otomatis dari sistem.
              </div>
              <div className="text-right">
                Hormat kami,<br />
                <span className="font-semibold text-black/80">{inv.seller_name}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

