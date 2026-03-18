"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { ArrowLeft, ChevronDown, ChevronUp, MessageCircle, Package } from "lucide-react";
import {
  ORDER_STATUS_FLOW,
  ORDER_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
} from "@/app/lib/marketplaceOrderLabels";
import { digitsFromPriceString, formatRupiahFromDigits } from "@/app/lib/formatRupiah";
import { sellerToBuyerWaMessage } from "@/app/lib/marketplaceWaTemplates";

type OrderItem = {
  product_id: string;
  title: string;
  price: string;
  qty: number;
  href: string;
};

type OrderRow = {
  id: string;
  created_at: string;
  status: string | null;
  customer_name: string;
  customer_phone: string;
  shipping_address: string | null;
  payment_method: string | null;
  notes: string | null;
  items: OrderItem[];
  my_items?: OrderItem[];
  is_mixed_seller?: boolean;
};

const FILTER_TABS = [
  { id: "all", label: "Semua" },
  { id: "menunggu", label: "Menunggu" },
  { id: "diproses", label: "Diproses" },
  { id: "dikirim", label: "Dikirim" },
  { id: "komplain", label: "Komplain" },
  { id: "selesai", label: "Selesai" },
  { id: "dibatalkan", label: "Dibatalkan" },
] as const;

function itemsTotal(items: OrderItem[]): string {
  const t = items.reduce(
    (a, it) => a + BigInt(digitsFromPriceString(it.price) || "0") * BigInt(it.qty),
    BigInt(0),
  );
  return formatRupiahFromDigits(t.toString());
}

function waDigits(phone: string): string | null {
  let d = phone.replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("62")) return d.length >= 11 ? d : null;
  if (d.startsWith("0")) d = "62" + d.slice(1);
  else if (d.length >= 9) d = "62" + d;
  return d.length >= 11 ? d : null;
}

export default function MarketplaceIncomingOrdersModule() {
  const router = useRouter();
  const sp = useSearchParams();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<(typeof FILTER_TABS)[number]["id"]>("all");
  const origin =
    typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL ?? "";
  const orderFromQuery = sp.get("order")?.trim() || "";

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/konten/marketplace/incoming-orders", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (d: {
          orders?: OrderRow[];
          is_superadmin?: boolean;
        } | null) => {
          if (d?.orders) {
            setOrders(
              d.orders.map((o) => ({
                ...o,
                status: o.status ?? "menunggu",
                my_items: Array.isArray(o.my_items) ? o.my_items : o.items,
              })),
            );
            setIsSuperadmin(!!d.is_superadmin);
          }
        },
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!orderFromQuery) return;
    const found = orders.some((x) => x.id === orderFromQuery);
    if (found) setOpenId(orderFromQuery);
  }, [orderFromQuery, orders]);

  useEffect(() => {
    if (!orderFromQuery) return;
    if (!openId || openId !== orderFromQuery) return;
    const el = document.getElementById(`order-${orderFromQuery}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [openId, orderFromQuery]);

  const patchStatus = async (orderId: string, status: string) => {
    setUpdating(orderId);
    try {
      const res = await fetch(`/api/konten/marketplace/incoming-orders/${orderId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof j?.message === "string" ? j.message : "Gagal ubah status");
        return;
      }
      toast.success("Status diperbarui");
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status } : o)),
      );
    } catch {
      toast.error("Jaringan bermasalah");
    } finally {
      setUpdating(null);
    }
  };

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/dashboard/marketplace-saya");
    }
  };

  return (
    <div className="space-y-6 pb-10 max-w-3xl">
      <button
        type="button"
        onClick={() => goBack()}
        className="inline-flex items-center gap-2 text-sm text-white/65 hover:text-teal-300 transition-colors -mt-1 mb-1"
      >
        <ArrowLeft size={18} className="shrink-0" />
        Kembali
      </button>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white">Pesanan masuk</h1>
          <p className="text-sm text-white/55 mt-1">
            Pembeli yang checkout produk Anda. Hubungi pembeli lewat WhatsApp untuk konfirmasi bayar
            & kirim.
            {isSuperadmin ? (
              <span className="block mt-1 text-amber-200/70">
                Mode superadmin: semua pesanan marketplace.
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => load()}
            className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs sm:text-sm text-white/80 hover:bg-white/10"
          >
            Refresh
          </button>
          <Link
            href="/dashboard/marketplace-saya"
            className="rounded-md bg-cyan-600/90 hover:bg-cyan-500 px-3 py-1.5 text-xs sm:text-sm text-white"
          >
            Produk saya
          </Link>
        </div>
      </div>
      {!loading && orders.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 text-xs">
          {FILTER_TABS.map((tab) => {
            const isActive = statusFilter === tab.id;
            const count =
              tab.id === "all"
                ? orders.length
                : orders.filter((o) => (o.status ?? "menunggu") === tab.id).length;
            if (tab.id !== "all" && count === 0) return null;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 transition-colors ${
                  isActive
                    ? "border-teal-400/70 bg-teal-500/10 text-teal-100"
                    : "border-white/12 bg-white/[0.02] text-white/60 hover:bg-white/[0.06]"
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] text-white/60">{count}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-white/50">Memuat…</p>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <Package className="w-10 h-10 mx-auto text-white/20 mb-2" />
          <p className="text-white/55 text-sm">
            Belum ada pesanan untuk produk Anda.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders
            .filter((o) =>
              statusFilter === "all" ? true : (o.status ?? "menunggu") === statusFilter,
            )
            .map((o) => {
            const open = openId === o.id;
            const displayItems =
              !isSuperadmin && o.my_items && o.my_items.length > 0 ? o.my_items : o.items;
            const wa = waDigits(o.customer_phone);
            const st = o.status ?? "menunggu";
            return (
              <li
                key={o.id}
                id={`order-${o.id}`}
                className="rounded-xl border border-white/10 bg-white/[0.04] overflow-hidden"
              >
                <div className="p-4 flex flex-col sm:flex-row sm:items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : o.id)}
                    className="flex-1 min-w-0 text-left flex items-start gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-white">
                          {o.customer_name}
                        </span>
                        <span className="text-xs text-white/40">
                          {new Date(o.created_at).toLocaleString("id-ID", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>
                      <div className="text-xs text-amber-300/90 mt-1">
                        {isSuperadmin
                          ? itemsTotal(o.items)
                          : itemsTotal(displayItems)}
                        {o.is_mixed_seller && !isSuperadmin ? (
                          <span className="text-white/45 ml-1">
                            (bagian produk Anda)
                          </span>
                        ) : null}
                      </div>
                      {o.is_mixed_seller && !isSuperadmin ? (
                        <p className="text-[11px] text-amber-200/60 mt-1">
                          Pesanan ini juga berisi produk penjual lain — koordinasi ongkir/bayar dengan
                          pembeli.
                        </p>
                      ) : null}
                    </div>
                    {open ? (
                      <ChevronUp className="shrink-0 text-white/40" />
                    ) : (
                      <ChevronDown className="shrink-0 text-white/40" />
                    )}
                  </button>
                  <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
                    {wa ? (
                      <a
                        href={`https://wa.me/${wa}?text=${encodeURIComponent(
                          sellerToBuyerWaMessage({
                            buyerName: o.customer_name,
                            orderId: o.id,
                            createdAtIso: o.created_at,
                            proofUrl: `${origin}/dashboard/marketplace/nota?order=${encodeURIComponent(
                              o.id,
                            )}`,
                            items: (isSuperadmin ? o.items : displayItems).map((it) => ({
                              title: it.title,
                              qty: it.qty,
                            })),
                            totalLabel: isSuperadmin ? itemsTotal(o.items) : itemsTotal(displayItems),
                          }),
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/35 px-3 py-1.5 text-xs text-[#25D366] font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MessageCircle size={14} />
                        WA pembeli
                      </a>
                    ) : null}
                    {st === "selesai" || st === "komplain" ? (
                      <span
                        className={`text-[11px] font-medium ${
                          st === "selesai"
                            ? "text-emerald-300/80"
                            : "text-fuchsia-200/80"
                        }`}
                      >
                        {st === "selesai" ? "Pesanan selesai" : "Komplain (tindak lanjut via WA)"}
                      </span>
                    ) : (
                      <select
                        value={st}
                        disabled={updating === o.id}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v !== st) void patchStatus(o.id, v);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded-lg bg-black/40 border border-white/15 text-sm text-white px-2 py-1.5 outline-none focus:border-teal-500/40 disabled:opacity-50"
                      >
                        {ORDER_STATUS_FLOW.filter(
                          (k) => k !== "selesai" && k !== "komplain",
                        ).map((k) => (
                          <option key={k} value={k}>
                            {ORDER_STATUS_LABEL[k]}
                          </option>
                        ))}
                      </select>
                    )}
                    {st === "menunggu" ? (
                      <button
                        type="button"
                        disabled={updating === o.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          void patchStatus(o.id, "diproses");
                        }}
                        className="inline-flex items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                      >
                        Terima pesanan
                      </button>
                    ) : null}
                  </div>
                </div>
                {open ? (
                  <div className="px-4 pb-4 border-t border-white/5 space-y-2 text-sm">
                    <div className="text-white/45 text-xs pt-3">Item</div>
                    <ul className="space-y-1">
                      {(isSuperadmin ? o.items : displayItems).map((it) => (
                        <li
                          key={it.product_id}
                          className="flex justify-between gap-2 text-white/80"
                        >
                          <span className="truncate">
                            {it.title} × {it.qty}
                          </span>
                          <span className="text-amber-300/80 shrink-0">
                            {formatRupiahFromDigits(
                              (
                                BigInt(digitsFromPriceString(it.price) || "0") *
                                BigInt(it.qty)
                              ).toString(),
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="text-xs text-white/50 space-y-1 pt-2">
                      <div>HP: {o.customer_phone}</div>
                      <div>
                        Bayar:{" "}
                        {PAYMENT_METHOD_LABEL[o.payment_method ?? ""] ??
                          o.payment_method ??
                          "—"}
                      </div>
                      {o.shipping_address ? <div>Alamat: {o.shipping_address}</div> : null}
                      {o.notes ? <div>Catatan: {o.notes}</div> : null}
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
