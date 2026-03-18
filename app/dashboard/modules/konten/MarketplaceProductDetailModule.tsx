"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Minus, Plus, ShoppingBag, ShoppingCart, ExternalLink } from "lucide-react";
import { toast } from "react-hot-toast";
import { displayRupiah } from "@/app/lib/formatRupiah";
import { useMarketplaceCartStore } from "@/app/dashboard/store/marketplaceCartStore";

type Item = {
  id: string;
  title: string;
  price: string;
  image: string | null;
  href: string;
  description: string | null;
  category: string;
};

const isExternal = (h: string) => /^https?:\/\//i.test(h);

export default function MarketplaceProductDetailModule() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const addLine = useMarketplaceCartStore((s) => s.addLine);

  useEffect(() => {
    if (!id) return;
    let c = false;
    fetch(`/api/home/marketplace/item/${id}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { item?: Item } | null) => {
        if (!c && d?.item) setItem(d.item);
      })
      .finally(() => {
        if (!c) setLoading(false);
      });
    return () => {
      c = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="pb-8 text-sm text-white/50">Memuat produk…</div>
    );
  }

  if (!item) {
    return (
      <div className="space-y-4 pb-8">
        <p className="text-white/60">Produk tidak ditemukan atau sudah tidak aktif.</p>
        <Link
          href="/dashboard/marketplace"
          className="inline-flex items-center gap-2 text-teal-400 hover:text-teal-300 text-sm"
        >
          <ArrowLeft size={16} /> Kembali ke katalog
        </Link>
      </div>
    );
  }

  const addToCart = () => {
    addLine({
      productId: item.id,
      title: item.title,
      price: item.price,
      image: item.image,
      href: item.href,
      qty,
    });
    toast.success(`${qty} item masuk keranjang`);
    setQty(1);
  };

  return (
    <div className="space-y-6 pb-10 max-w-3xl">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white"
        >
          <ArrowLeft size={16} /> Kembali
        </button>
        <Link href="/dashboard/marketplace" className="text-sm text-teal-400 hover:text-teal-300">
          Katalog
        </Link>
        <Link
          href="/dashboard/marketplace/keranjang"
          className="inline-flex items-center gap-1.5 text-sm text-amber-300/90 hover:text-amber-200"
        >
          <ShoppingCart size={16} /> Keranjang
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="relative aspect-square rounded-2xl border border-white/10 bg-black/40 overflow-hidden">
          {item.image ? (
            <Image
              src={item.image}
              alt={item.title}
              fill
              className="object-contain"
              sizes="(max-width:640px) 100vw, 400px"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <ShoppingBag className="w-20 h-20 text-teal-500/30" />
            </div>
          )}
        </div>

        <div className="space-y-4">
          {item.category ? (
            <span className="text-xs px-2 py-0.5 rounded-full border border-teal-500/30 text-teal-200">
              {item.category}
            </span>
          ) : null}
          <h1 className="text-xl sm:text-2xl font-semibold text-white">{item.title}</h1>
          <p className="text-2xl font-medium text-amber-400">{displayRupiah(item.price)}</p>
          {item.description ? (
            <p className="text-sm text-white/65 whitespace-pre-wrap">{item.description}</p>
          ) : (
            <p className="text-sm text-white/40">Tidak ada deskripsi tambahan.</p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <span className="text-sm text-white/50">Jumlah</span>
            <div className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] p-1">
              <button
                type="button"
                className="p-1.5 rounded-md hover:bg-white/10 text-white/80"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label="Kurangi"
              >
                <Minus size={16} />
              </button>
              <span className="w-8 text-center text-sm tabular-nums text-white">{qty}</span>
              <button
                type="button"
                className="p-1.5 rounded-md hover:bg-white/10 text-white/80"
                onClick={() => setQty((q) => Math.min(99, q + 1))}
                aria-label="Tambah"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <button
              type="button"
              onClick={addToCart}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-500 px-5 py-3 text-sm font-medium text-white"
            >
              <ShoppingCart size={18} />
              Tambah ke keranjang
            </button>
            {isExternal(item.href) ? (
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.06] hover:bg-white/10 px-5 py-3 text-sm text-white/90"
              >
                <ExternalLink size={16} />
                Beli di toko penjual
              </a>
            ) : (
              <Link
                href={item.href}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.06] hover:bg-white/10 px-5 py-3 text-sm text-white/90"
              >
                Lanjut ke tautan produk
              </Link>
            )}
          </div>

          <p className="text-[11px] text-white/40 pt-2">
            Keranjang menyimpan pilihan Anda di perangkat ini. Checkout untuk mengirim data ke sistem
            (penjual dapat menindaklanjuti).
          </p>
        </div>
      </div>
    </div>
  );
}
