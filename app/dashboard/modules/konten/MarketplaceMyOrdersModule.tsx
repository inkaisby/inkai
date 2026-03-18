"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, MessageCircle, Package } from "lucide-react";
import toast from "react-hot-toast";
import {
  ORDER_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
} from "@/app/lib/marketplaceOrderLabels";
import { digitsFromPriceString, formatRupiahFromDigits } from "@/app/lib/formatRupiah";
import { buyerToSellerWaMessage } from "@/app/lib/marketplaceWaTemplates";
import { ReceiptText } from "lucide-react";

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
};

type SellerContact = {
  seller_key: string;
  seller_name: string;
  wa_digits: string | null;
  product_ids: string[];
  product_titles: string[];
};

function orderTotal(items: OrderItem[]): string {
  const t = items.reduce(
    (a, it) => a + BigInt(digitsFromPriceString(it.price) || "0") * BigInt(it.qty),
    BigInt(0),
  );
  return formatRupiahFromDigits(t.toString());
}

const FILTER_TABS = [
  { id: "all", label: "Semua" },
  { id: "menunggu", label: "Menunggu konfirmasi" },
  { id: "diproses", label: "Dikemas / diproses" },
  { id: "dikirim", label: "Dikirim" },
  { id: "komplain", label: "Komplain" },
  { id: "selesai", label: "Selesai" },
  { id: "dibatalkan", label: "Ditolak / dibatalkan" },
] as const;

function statusClass(s: string) {
  switch (s) {
    case "selesai":
      return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    case "komplain":
      return "bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-500/25";
    case "dibatalkan":
      return "bg-red-500/15 text-red-300 border-red-500/25";
    case "dikirim":
      return "bg-sky-500/15 text-sky-300 border-sky-500/25";
    case "diproses":
      return "bg-amber-500/15 text-amber-300 border-amber-500/25";
    default:
      return "bg-white/10 text-white/70 border-white/15";
  }
}

export default function MarketplaceMyOrdersModule() {
  const sp = useSearchParams();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [contactsByOrder, setContactsByOrder] = useState<Record<string, SellerContact[]>>({});
  const [contactsLoadingId, setContactsLoadingId] = useState<string | null>(null);
  const [confirmOrder, setConfirmOrder] = useState<OrderRow | null>(null);
  const [confirmMode, setConfirmMode] =
    useState<"cancel" | "delete" | "complete" | "complain" | null>(null);
  const [statusFilter, setStatusFilter] = useState<(typeof FILTER_TABS)[number]["id"]>("all");
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const origin =
    typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL ?? "";
  const orderFromQuery = useMemo(() => sp.get("order")?.trim() || "", [sp]);
  const orderFromQueryRef = useRef(orderFromQuery);

  useEffect(() => {
    orderFromQueryRef.current = orderFromQuery;
  }, [orderFromQuery]);

  useEffect(() => {
    let c = false;
    fetch("/api/home/marketplace/orders", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { orders?: OrderRow[] } | null) => {
        if (!c && d?.orders) {
          const nextOrders = d.orders.map((o) => ({
              ...o,
              items: Array.isArray(o.items) ? o.items : [],
              status: o.status ?? "menunggu",
            }));
          setOrders(nextOrders);
          const q = orderFromQueryRef.current;
          if (q) {
            const found = nextOrders.some((x) => x.id === q);
            if (found) setOpenId(q);
          }
        }
      })
      .finally(() => {
        if (!c) setLoading(false);
      });
    return () => {
      c = true;
    };
  }, []);

  useEffect(() => {
    if (!orderFromQuery) return;
    if (!openId || openId !== orderFromQuery) return;
    const el = document.getElementById(`order-${orderFromQuery}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [openId, orderFromQuery]);

  const loadContactsForOrder = async (order: OrderRow) => {
    if (!order.items.length || contactsByOrder[order.id]) return;
    const ids = Array.from(new Set(order.items.map((it) => it.product_id))).join(",");
    if (!ids) return;
    setContactsLoadingId(order.id);
    try {
      const res = await fetch(
        `/api/home/marketplace/seller-contacts?ids=${encodeURIComponent(ids)}`,
        { credentials: "include" },
      );
      const j = (await res.json().catch(() => ({}))) as { contacts?: SellerContact[] };
      if (res.ok && Array.isArray(j.contacts)) {
        setContactsByOrder((prev) => ({ ...prev, [order.id]: j.contacts! }));
      }
    } finally {
      setContactsLoadingId((prev) => (prev === order.id ? null : prev));
    }
  };

  const performBuyerStatusUpdate = async (
    order: OrderRow,
    nextStatus: "selesai" | "komplain",
  ) => {
    if (updatingId === order.id) return;
    setUpdatingId(order.id);
    try {
      const res = await fetch(`/api/home/marketplace/orders/${order.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const j = (await res.json().catch(() => ({}))) as { message?: string; status?: string };
      if (!res.ok) {
        toast.error(j?.message || "Gagal memperbarui status.");
        return;
      }
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: j.status ?? nextStatus } : o)),
      );
      toast.success(nextStatus === "selesai" ? "Pesanan diselesaikan." : "Status komplain dibuat.");
    } catch {
      toast.error("Terjadi kesalahan jaringan.");
    } finally {
      setUpdatingId((prev) => (prev === order.id ? null : prev));
    }
  };

  const performCancelOrder = async (order: OrderRow) => {
    if (
      order.status === "selesai" ||
      order.status === "dibatalkan" ||
      cancelingId === order.id
    ) {
      return;
    }
    setCancelingId(order.id);
    try {
      const res = await fetch(`/api/home/marketplace/orders/${order.id}`, {
        method: "PATCH",
        credentials: "include",
      });
      const j = (await res.json().catch(() => ({}))) as { message?: string; status?: string };
      if (!res.ok) {
        toast.error(j?.message || "Gagal membatalkan pesanan.");
        return;
      }
      const nextStatus = j.status || "dibatalkan";
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: nextStatus } : o)),
      );
      toast.success("Pesanan dibatalkan.");
    } catch {
      toast.error("Terjadi kesalahan jaringan.");
    } finally {
      setCancelingId((prev) => (prev === order.id ? null : prev));
    }
  };

  const performDeleteOrder = async (order: OrderRow) => {
    if (
      (order.status !== "selesai" && order.status !== "dibatalkan") ||
      deletingId === order.id
    ) {
      return;
    }
    setDeletingId(order.id);
    try {
      const res = await fetch(`/api/home/marketplace/orders/${order.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const j = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        toast.error(j?.message || "Gagal menghapus pesanan.");
        return;
      }
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
      setOpenId((prev) => (prev === order.id ? null : prev));
      toast.success("Pesanan dihapus dari riwayat.");
    } catch {
      toast.error("Terjadi kesalahan jaringan.");
    } finally {
      setDeletingId((prev) => (prev === order.id ? null : prev));
    }
  };

  const handleCancelOrder = (order: OrderRow) => {
    setConfirmOrder(order);
    setConfirmMode("cancel");
  };

  const handleDeleteOrder = (order: OrderRow) => {
    setConfirmOrder(order);
    setConfirmMode("delete");
  };

  const handleCompleteOrder = (order: OrderRow) => {
    setConfirmOrder(order);
    setConfirmMode("complete");
  };

  const handleComplainOrder = (order: OrderRow) => {
    setConfirmOrder(order);
    setConfirmMode("complain");
  };

  const closeConfirm = () => {
    setConfirmOrder(null);
    setConfirmMode(null);
  };

  const runConfirm = async () => {
    if (!confirmOrder || !confirmMode) return;
    if (confirmMode === "cancel") {
      await performCancelOrder(confirmOrder);
    } else if (confirmMode === "delete") {
      await performDeleteOrder(confirmOrder);
    } else if (confirmMode === "complete") {
      await performBuyerStatusUpdate(confirmOrder, "selesai");
    } else {
      await performBuyerStatusUpdate(confirmOrder, "komplain");
    }
    closeConfirm();
  };

  return (
    <div className="space-y-6 pb-10 max-w-2xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white">Pesanan saya</h1>
          <p className="text-sm text-white/55 mt-1">
            Riwayat checkout marketplace. Status diperbarui oleh penjual.
          </p>
        </div>
        <Link
          href="/dashboard/marketplace"
          className="text-sm text-teal-400 hover:text-teal-300"
        >
          ← Katalog
        </Link>
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
          <p className="text-white/55 text-sm">Belum ada pesanan.</p>
          <Link
            href="/dashboard/marketplace"
            className="inline-block mt-4 text-teal-400 text-sm hover:text-teal-300"
          >
            Jelajahi marketplace
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders
            .filter((o) =>
              statusFilter === "all" ? true : (o.status ?? "menunggu") === statusFilter,
            )
            .map((o) => {
              const open = openId === o.id;
              const st = o.status ?? "menunggu";
              const contacts = contactsByOrder[o.id] ?? [];
              const waiting = st === "menunggu";
              const canCancel = st === "menunggu" || st === "diproses";
              const canDelete = st === "dibatalkan" || st === "selesai";
              const canConfirmReceive = st === "dikirim";
              const isComplain = st === "komplain";
              const isCanceling = cancelingId === o.id;
              const isDeleting = deletingId === o.id;
              const isUpdating = updatingId === o.id;
              return (
              <li
                key={o.id}
                id={`order-${o.id}`}
                className="rounded-xl border border-white/10 bg-white/[0.04] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => {
                    const next = open ? null : o.id;
                    setOpenId(next);
                    const needContacts =
                      (waiting || canConfirmReceive || isComplain) && !contactsByOrder[o.id];
                    if (!open && needContacts) {
                      void loadContactsForOrder(o);
                    }
                  }}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.03]"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-md border ${statusClass(st)}`}
                      >
                        {ORDER_STATUS_LABEL[st] ?? st}
                      </span>
                      <span className="text-xs text-white/40">
                        {new Date(o.created_at).toLocaleString("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                    <div className="text-sm text-white/90 mt-1 truncate">
                      {o.items.length} item · {orderTotal(o.items)}
                    </div>
                  </div>
                  {open ? (
                    <ChevronUp className="shrink-0 text-white/40" />
                  ) : (
                    <ChevronDown className="shrink-0 text-white/40" />
                  )}
                </button>
                {open ? (
                  <div className="px-4 pb-4 pt-0 border-t border-white/5 space-y-3 text-sm">
                    <div className="text-white/45 text-xs uppercase tracking-wide pt-3">
                      Detail
                    </div>
                    <ul className="space-y-1.5">
                      {o.items.map((it) => (
                        <li
                          key={it.product_id}
                          className="flex justify-between gap-2 text-white/80"
                        >
                          <span className="truncate">
                            {it.title} × {it.qty}
                          </span>
                          <span className="text-amber-300/90 shrink-0">
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
                    <div className="flex justify-between font-medium text-white border-t border-white/10 pt-2">
                      <span>Total</span>
                      <span className="text-amber-400">{orderTotal(o.items)}</span>
                    </div>
                    <div className="grid gap-1 text-xs text-white/55">
                      <div>
                        <span className="text-white/35">Bayar: </span>
                        {PAYMENT_METHOD_LABEL[o.payment_method ?? ""] ??
                          o.payment_method ??
                          "—"}
                      </div>
                      <div>
                        <span className="text-white/35">Nama: </span>
                        {o.customer_name}
                      </div>
                      <div>
                        <span className="text-white/35">HP: </span>
                        {o.customer_phone}
                      </div>
                      {o.shipping_address ? (
                        <div>
                          <span className="text-white/35">Alamat: </span>
                          {o.shipping_address}
                        </div>
                      ) : null}
                      {o.notes ? (
                        <div>
                          <span className="text-white/35">Catatan: </span>
                          {o.notes}
                        </div>
                      ) : null}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
                      <Link
                        href={`/dashboard/marketplace/nota?order=${encodeURIComponent(o.id)}`}
                        className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.05] px-3 py-1.5 text-xs text-white/85 hover:bg-white/[0.09]"
                      >
                        <ReceiptText className="w-4 h-4" />
                        Lihat nota
                      </Link>
                    </div>
                    {waiting ? (
                      <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                        <div className="flex items-center gap-2 text-xs text-white/55">
                          <MessageCircle className="w-4 h-4 text-emerald-400" />
                          <span>Hubungi penjual (WhatsApp)</span>
                        </div>
                        {contactsLoadingId === o.id ? (
                          <p className="text-[11px] text-white/45">
                            Memuat kontak penjual…
                          </p>
                        ) : contacts.length === 0 ? (
                          <p className="text-[11px] text-white/45">
                            Tombol WA muncul jika penjual mengisi nomor WhatsApp di profil atau admin
                            mengatur nomor toko.
                          </p>
                        ) : (
                          <ul className="space-y-1.5">
                            {contacts.map((c) => {
                              if (!c.wa_digits) return null;
                              const idSet = new Set(c.product_ids);
                              const itemsForSeller = o.items.filter((it) =>
                                idSet.has(it.product_id),
                              );
                              const totalForSeller = orderTotal(itemsForSeller);
                              const proofUrl = `${origin}/dashboard/marketplace/nota?order=${encodeURIComponent(
                                o.id,
                              )}`;
                              const msg = buyerToSellerWaMessage({
                                sellerName: c.seller_name,
                                orderId: o.id,
                                createdAtIso: o.created_at,
                                proofUrl,
                                items: (itemsForSeller.length ? itemsForSeller : o.items).map(
                                  (it) => ({ title: it.title, qty: it.qty }),
                                ),
                                totalLabel: totalForSeller,
                              });
                              const href = `https://wa.me/${c.wa_digits}?text=${encodeURIComponent(
                                msg,
                              )}`;
                              return (
                                <li key={c.seller_key}>
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-between gap-2 rounded-lg bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/35 px-3 py-1.5 text-xs text-[#eafff4]"
                                  >
                                    <span className="truncate">
                                      {c.seller_name}
                                      <span className="text-[10px] text-white/60 ml-1">
                                        (
                                        {Array.from(new Set(c.product_titles))
                                          .slice(0, 2)
                                          .join(", ")}
                                        {c.product_titles.length > 2
                                          ? ` +${c.product_titles.length - 2}`
                                          : ""}
                                        )
                                      </span>
                                    </span>
                                    <span className="flex items-center gap-1 text-[11px] font-medium text-[#25D366]">
                                      <MessageCircle className="w-3 h-3" />
                                      Chat
                                    </span>
                                  </a>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    ) : null}
                    {canConfirmReceive ? (
                      <div className="mt-3 border-t border-white/10 pt-3 space-y-2">
                        <div className="text-xs text-white/55">
                          Barang sudah diterima?
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            type="button"
                            onClick={() => handleCompleteOrder(o)}
                            disabled={isUpdating}
                            className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 px-3 py-2 text-xs font-medium text-white"
                          >
                            {isUpdating ? "Memproses…" : "Barang sesuai (Selesaikan)"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleComplainOrder(o)}
                            disabled={isUpdating}
                            className="flex-1 rounded-lg border border-fuchsia-500/35 bg-fuchsia-500/10 hover:bg-fuchsia-500/15 disabled:opacity-60 px-3 py-2 text-xs font-medium text-fuchsia-100"
                          >
                            {isUpdating ? "Memproses…" : "Ada masalah (Komplain)"}
                          </button>
                        </div>
                        <p className="text-[11px] text-white/40">
                          Jika ada masalah, status menjadi Komplain dan Anda bisa lanjut chat WA dengan penjual.
                        </p>
                      </div>
                    ) : null}
                    {isComplain ? (
                      <div className="mt-3 border-t border-white/10 pt-3 space-y-2">
                        <div className="text-xs font-medium text-fuchsia-200">
                          Status: Komplain
                        </div>
                        <p className="text-[11px] text-white/45">
                          Silakan hubungi penjual via WhatsApp untuk solusi (tukar/retur/perbaikan).
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            type="button"
                            onClick={() => handleCompleteOrder(o)}
                            disabled={isUpdating}
                            className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 px-3 py-2 text-xs font-medium text-white"
                          >
                            {isUpdating ? "Memproses…" : "Masalah sudah beres (Selesaikan)"}
                          </button>
                        </div>
                        {contacts.length > 0 ? (
                          <div className="space-y-1.5">
                            {contacts.map((c) => {
                              if (!c.wa_digits) return null;
                              const idSet = new Set(c.product_ids);
                              const itemsForSeller = o.items.filter((it) =>
                                idSet.has(it.product_id),
                              );
                              const totalForSeller = orderTotal(itemsForSeller);
                              const proofUrl = `${origin}/dashboard/marketplace/nota?order=${encodeURIComponent(
                                o.id,
                              )}`;
                              const msg = buyerToSellerWaMessage({
                                sellerName: c.seller_name,
                                orderId: o.id,
                                createdAtIso: o.created_at,
                                proofUrl,
                                items: itemsForSeller.map((it) => ({
                                  title: it.title,
                                  qty: it.qty,
                                })),
                                totalLabel: totalForSeller,
                              });
                              const href = `https://wa.me/${c.wa_digits}?text=${encodeURIComponent(
                                msg,
                              )}`;
                              return (
                                <a
                                  key={c.seller_key}
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-between gap-2 rounded-lg bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/35 px-3 py-1.5 text-xs text-[#eafff4]"
                                >
                                  <span className="truncate">{c.seller_name}</span>
                                  <span className="flex items-center gap-1 text-[11px] font-medium text-[#25D366]">
                                    <MessageCircle className="w-3 h-3" />
                                    Chat
                                  </span>
                                </a>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[11px] text-white/45">
                            Kontak WA penjual belum tersedia.
                          </p>
                        )}
                      </div>
                    ) : null}
                    <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 gap-3">
                      {canCancel ? (
                        <button
                          type="button"
                          onClick={() => void handleCancelOrder(o)}
                          disabled={isCanceling}
                          className={`inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                            isCanceling
                              ? "border-white/20 bg-white/5 text-white/50 cursor-wait"
                              : "border-red-500/40 bg-red-500/10 text-red-200 hover:bg-red-500/20"
                          }`}
                        >
                          {isCanceling ? "Membatalkan…" : "Batalkan pesanan"}
                        </button>
                      ) : (
                        <span className="text-[11px] text-white/35">
                          Status pesanan: {ORDER_STATUS_LABEL[st] ?? st}
                        </span>
                      )}
                      {canDelete ? (
                        <button
                          type="button"
                          onClick={() => void handleDeleteOrder(o)}
                          disabled={isDeleting}
                          className="text-[11px] text-white/45 hover:text-red-300 hover:underline underline-offset-2 disabled:opacity-60"
                        >
                          {isDeleting ? "Menghapus…" : "Hapus dari riwayat"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {confirmOrder && confirmMode ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#050816]/95 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.8)]"
            role="alertdialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-3">
              <div className="text-sm font-semibold text-white">
                {confirmMode === "cancel"
                  ? "Batalkan pesanan?"
                  : confirmMode === "delete"
                    ? "Hapus dari riwayat?"
                    : confirmMode === "complete"
                      ? "Selesaikan pesanan?"
                      : "Buat komplain?"}
              </div>
              <p className="text-xs text-white/60 leading-relaxed">
                {confirmMode === "cancel"
                  ? "Pesanan akan diberi status dibatalkan. Penjual bisa melihat bahwa Anda membatalkan pesanan ini."
                  : confirmMode === "delete"
                    ? "Pesanan akan dihapus dari riwayat di akun Anda. Data ini tidak bisa dikembalikan, namun penjual masih dapat menyimpan catatan mereka sendiri."
                    : confirmMode === "complete"
                      ? "Pastikan barang sudah diterima dan sesuai. Setelah diselesaikan, status tidak bisa dikembalikan."
                      : "Status pesanan akan menjadi Komplain. Anda bisa lanjut koordinasi dengan penjual via WhatsApp."}
              </p>
              <div className="rounded-md bg-white/[0.03] border border-white/10 px-3 py-2 text-xs text-white/65">
                <div className="font-medium truncate">{confirmOrder.items[0]?.title}</div>
                {confirmOrder.items.length > 1 ? (
                  <div className="text-white/45">
                    dan {confirmOrder.items.length - 1} item lainnya
                  </div>
                ) : null}
              </div>
            </div>
            <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                onClick={closeConfirm}
                className="inline-flex justify-center rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-xs sm:text-sm text-white/85 hover:bg-white/[0.1]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void runConfirm()}
                className={`inline-flex justify-center rounded-xl px-4 py-2.5 text-xs sm:text-sm font-medium ${
                  confirmMode === "cancel" || confirmMode === "delete"
                    ? "bg-red-600 hover:bg-red-500 text-white"
                    : confirmMode === "complete"
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                      : "bg-fuchsia-600 hover:bg-fuchsia-500 text-white"
                }`}
              >
                {confirmMode === "cancel"
                  ? "Ya, batalkan pesanan"
                  : confirmMode === "delete"
                    ? "Ya, hapus pesanan"
                    : confirmMode === "complete"
                      ? "Ya, selesaikan"
                      : "Ya, komplain"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
