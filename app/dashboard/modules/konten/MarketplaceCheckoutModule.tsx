"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { MessageCircle, Truck } from "lucide-react";
import {
  useMarketplaceCartStore,
  isLineSelected,
} from "@/app/dashboard/store/marketplaceCartStore";
import { digitsFromPriceString, formatRupiahFromDigits } from "@/app/lib/formatRupiah";

const PAYMENT_OPTIONS = [
  {
    id: "transfer_bank" as const,
    label: "Transfer bank",
    hint: "Rekening tujuan biasanya dikirim lewat WA setelah konfirmasi.",
  },
  {
    id: "ewallet" as const,
    label: "E-wallet / QRIS",
    hint: "Pembayaran lewat aplikasi dompet digital atau scan QRIS.",
  },
  {
    id: "cod" as const,
    label: "COD / bayar di tempat",
    hint: "Bayar saat barang diterima (sesuai kesepakatan penjual).",
  },
  {
    id: "other" as const,
    label: "Lainnya",
    hint: "Misalnya tunai di dojo — diskusi dengan penjual.",
  },
];

type PaymentId = (typeof PAYMENT_OPTIONS)[number]["id"];

const PAYMENT_LABEL: Record<PaymentId, string> = {
  transfer_bank: "Transfer bank",
  ewallet: "E-wallet / QRIS",
  cod: "COD / bayar di tempat",
  other: "Lainnya",
};

type SellerContact = {
  seller_key: string;
  seller_name: string;
  wa_digits: string | null;
  product_ids: string[];
  product_titles: string[];
};

function waMessagePrefill(params: {
  buyerName: string;
  lines: { title: string; qty: number; subtotal: string }[];
  totalLabel: string;
  paymentLabel: string;
}): string {
  const items = params.lines
    .map((l) => `• ${l.title} × ${l.qty} (${l.subtotal})`)
    .join("\n");
  return (
    `Halo, saya *${params.buyerName || "pembeli"}* ingin konfirmasi pesanan marketplace:\n\n` +
    `${items}\n\n` +
    `*Total:* ${params.totalLabel}\n` +
    `*Metode bayar:* ${params.paymentLabel}\n\n` +
    `Mohon konfirmasi ketersediaan & cara pembayaran. Terima kasih.`
  );
}

export default function MarketplaceCheckoutModule() {
  const router = useRouter();
  const lines = useMarketplaceCartStore((s) => s.lines);
  const removeLinesByIds = useMarketplaceCartStore((s) => s.removeLinesByIds);

  const selectedLines = useMemo(() => lines.filter(isLineSelected), [lines]);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentId | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [contacts, setContacts] = useState<SellerContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);

  const lineRows = useMemo(
    () =>
      selectedLines.map((l) => ({
        productId: l.productId,
        title: l.title,
        qty: l.qty,
        subtotal: formatRupiahFromDigits(
          (BigInt(digitsFromPriceString(l.price) || "0") * BigInt(l.qty)).toString(),
        ),
      })),
    [selectedLines],
  );

  const total = selectedLines.reduce(
    (a, l) => a + BigInt(digitsFromPriceString(l.price) || "0") * BigInt(l.qty),
    BigInt(0),
  );
  const totalLabel =
    selectedLines.length > 0 ? formatRupiahFromDigits(total.toString()) : "Rp 0";

  const idsParam = useMemo(
    () => selectedLines.map((l) => l.productId).join(","),
    [selectedLines],
  );

  useEffect(() => {
    if (!idsParam) {
      setContacts([]);
      return;
    }
    let cancelled = false;
    setContactsLoading(true);
    fetch(`/api/home/marketplace/seller-contacts?ids=${encodeURIComponent(idsParam)}`, {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { contacts?: SellerContact[] } | null) => {
        if (!cancelled && Array.isArray(d?.contacts)) setContacts(d.contacts);
      })
      .finally(() => {
        if (!cancelled) setContactsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [idsParam]);

  const paymentLabelForWa =
    paymentMethod && PAYMENT_LABEL[paymentMethod as PaymentId]
      ? PAYMENT_LABEL[paymentMethod as PaymentId]
      : "(pilih metode bayar di bawah)";

  const submit = async () => {
    if (!name.trim() || !phone.trim()) {
      toast.error("Nama dan nomor HP wajib diisi.");
      return;
    }
    if (!paymentMethod) {
      toast.error("Pilih metode pembayaran.");
      return;
    }
    if (selectedLines.length === 0) {
      toast.error("Tidak ada produk terpilih. Kembali ke keranjang dan centang item.");
      return;
    }
    const ids = selectedLines.map((l) => l.productId);
    setSubmitting(true);
    try {
      const res = await fetch("/api/home/marketplace/order", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          shipping_address: address.trim(),
          notes: notes.trim(),
          payment_method: paymentMethod,
          items: selectedLines.map((l) => ({
            product_id: l.productId,
            title: l.title,
            price: l.price,
            qty: l.qty,
            href: l.href,
          })),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof json?.message === "string" ? json.message : "Gagal checkout.";
        if (msg.includes("payment_method") || msg.toLowerCase().includes("column")) {
          toast.error(
            "Kolom metode bayar belum di database. Jalankan migrasi / docs/sql/fix_marketplace_orders_payment.sql",
            { duration: 6000 },
          );
        } else {
          toast.error(msg);
        }
        return;
      }
      toast.success("Pesanan tersimpan. Lihat status di Pesanan saya.");
      removeLinesByIds(ids);
      router.push("/dashboard/marketplace/pesanan");
    } catch {
      toast.error("Jaringan bermasalah.");
    } finally {
      setSubmitting(false);
    }
  };

  if (lines.length === 0) {
    return (
      <div className="space-y-4 pb-10 max-w-lg">
        <p className="text-white/55">Keranjang kosong.</p>
        <Link href="/dashboard/marketplace/keranjang" className="text-teal-400 text-sm">
          ← Kembali ke keranjang
        </Link>
      </div>
    );
  }

  if (selectedLines.length === 0) {
    return (
      <div className="space-y-4 pb-10 max-w-lg">
        <h1 className="text-xl font-semibold text-white">Checkout</h1>
        <p className="text-white/55 text-sm">
          Belum ada produk terpilih. Di keranjang, centang item yang ingin dibeli lalu kembali ke
          sini.
        </p>
        <Link
          href="/dashboard/marketplace/keranjang"
          className="inline-block rounded-xl bg-teal-600 hover:bg-teal-500 px-4 py-2.5 text-sm text-white"
        >
          Ke keranjang
        </Link>
      </div>
    );
  }

  const hasAnyWa = contacts.some((c) => c.wa_digits);

  return (
    <div className="space-y-6 pb-10 max-w-lg">
      <h1 className="text-xl font-semibold text-white">Checkout</h1>
      <p className="text-sm text-white/50">
        Hanya produk yang Anda centang di keranjang. Isi data, pilih cara bayar, lalu konfirmasi —
        hubungi penjual di WhatsApp untuk rekening / ongkir.
      </p>

      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 space-y-2 text-sm">
        <div className="text-white/45 text-xs mb-2">Ringkasan (terpilih)</div>
        {lineRows.map((l) => (
          <div key={l.productId} className="flex justify-between gap-2 text-white/80">
            <span className="truncate">
              {l.title} × {l.qty}
            </span>
            <span className="text-amber-300/90 shrink-0">{l.subtotal}</span>
          </div>
        ))}
        <div className="border-t border-white/10 pt-2 mt-2 flex justify-between font-medium text-white">
          <span>Subtotal produk</span>
          <span className="text-amber-400">{totalLabel}</span>
        </div>
        <div className="flex items-start gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-xs text-white/45">
          <Truck className="w-4 h-4 shrink-0 mt-0.5 text-teal-400/80" />
          <span>
            <strong className="text-white/60">Ongkir</strong> belum termasuk — biasanya
            dikonfirmasi lewat WhatsApp setelah alamat lengkap.
          </span>
        </div>
      </div>

      {/* Hubungi WA */}
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4 space-y-3">
        <div className="text-sm font-medium text-white flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-emerald-400" />
          Hubungi penjual (WhatsApp)
        </div>
        {contactsLoading ? (
          <p className="text-xs text-white/45">Memuat kontak penjual…</p>
        ) : !hasAnyWa ? (
          <p className="text-xs text-white/50 leading-relaxed">
            Nomor WhatsApp penjual belum tersedia dari profil. Minta admin set{" "}
            <code className="text-teal-400/90 text-[10px]">NEXT_PUBLIC_MARKETPLACE_TOKO_WA</code>{" "}
            (angka, mis. 6281234567890) agar muncul tombol hubungi toko, atau isi nomor di profil
            keanggotaan penjual.
          </p>
        ) : (
          <ul className="space-y-2">
            {contacts.map((c) => {
              if (!c.wa_digits) return null;
              const idSet = new Set(c.product_ids);
              const relevantRows = lineRows.filter((row) => idSet.has(row.productId));
              const subtotalSeller = relevantRows.reduce(
                (a, row) =>
                  a +
                  BigInt(
                    digitsFromPriceString(
                      selectedLines.find((s) => s.productId === row.productId)?.price ?? "0",
                    ) || "0",
                  ) * BigInt(row.qty),
                BigInt(0),
              );
              const totalForSeller =
                relevantRows.length > 0
                  ? formatRupiahFromDigits(subtotalSeller.toString())
                  : totalLabel;
              const msgFixed = waMessagePrefill({
                buyerName: name.trim(),
                lines: relevantRows,
                totalLabel: totalForSeller,
                paymentLabel: paymentLabelForWa,
              });
              const href = `https://wa.me/${c.wa_digits}?text=${encodeURIComponent(msgFixed)}`;
              return (
                <li key={c.seller_key}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/30 px-3 py-2.5 text-sm text-white transition-colors"
                  >
                    <span>
                      <span className="font-medium text-emerald-200">{c.seller_name}</span>
                      <span className="block text-[11px] text-white/50 mt-0.5">
                        {Array.from(new Set(c.product_titles)).slice(0, 3).join(", ")}
                        {c.product_titles.length > 3
                          ? ` +${c.product_titles.length - 3}`
                          : ""}
                      </span>
                    </span>
                    <span className="text-xs font-medium text-[#25D366] shrink-0">
                      Chat WhatsApp →
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-[11px] text-white/40">
          Anda bisa chat dulu sebelum klik &quot;Konfirmasi pesanan&quot;, atau sebaliknya — pesanan
          tetap tercatat di sistem setelah konfirmasi.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <span className="text-xs text-white/50 block mb-2">Metode pembayaran</span>
          <div className="space-y-2">
            {PAYMENT_OPTIONS.map((opt) => (
              <label
                key={opt.id}
                className={`flex gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                  paymentMethod === opt.id
                    ? "border-teal-500/50 bg-teal-500/10"
                    : "border-white/10 bg-black/20 hover:border-white/15"
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  className="mt-1 text-teal-500 focus:ring-teal-500/30"
                  checked={paymentMethod === opt.id}
                  onChange={() => setPaymentMethod(opt.id)}
                />
                <div>
                  <div className="text-sm text-white font-medium">{opt.label}</div>
                  <div className="text-[11px] text-white/45 mt-0.5">{opt.hint}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-white/50">Nama lengkap</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg bg-black/35 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-teal-500/40"
            placeholder="Nama penerima"
          />
        </div>
        <div>
          <label className="text-xs text-white/50">Nomor HP / WhatsApp Anda</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-lg bg-black/35 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-teal-500/40"
            placeholder="08…"
            inputMode="tel"
          />
        </div>
        <div>
          <label className="text-xs text-white/50">Alamat pengiriman</label>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg bg-black/35 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-teal-500/40 resize-y"
            placeholder="Alamat lengkap (wajib untuk pengiriman)"
          />
        </div>
        <div>
          <label className="text-xs text-white/50">Catatan untuk penjual (opsional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg bg-black/35 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-teal-500/40 resize-y"
            placeholder="Ukuran, warna, waktu kirim…"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Link
          href="/dashboard/marketplace/keranjang"
          className="rounded-xl border border-white/15 px-4 py-2.5 text-center text-sm text-white/80 hover:bg-white/[0.06]"
        >
          Kembali ke keranjang
        </Link>
        <button
          type="button"
          disabled={submitting}
          onClick={() => void submit()}
          className="flex-1 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 py-2.5 text-sm font-medium text-white"
        >
          {submitting ? "Mengirim…" : "Konfirmasi pesanan"}
        </button>
      </div>
    </div>
  );
}
