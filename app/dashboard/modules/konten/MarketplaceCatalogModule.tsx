"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Package, Search, ShoppingBag, ShoppingCart } from "lucide-react";
import { useMarketplaceCartCount } from "@/app/dashboard/store/marketplaceCartStore";
import { displayRupiah } from "@/app/lib/formatRupiah";

type CatalogItem = {
  id: string;
  title: string;
  price: string;
  image: string | null;
  href: string;
  description: string | null;
  category: string;
};

export default function MarketplaceCatalogModule() {
  const cartCount = useMarketplaceCartCount();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/home/marketplace", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d: { items?: CatalogItem[] }) => {
        if (!cancelled) setItems(Array.isArray(d.items) ? d.items : []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const categoriesInUse = useMemo(() => {
    const s = new Set<string>();
    for (const i of items) {
      if (i.category?.trim()) s.add(i.category.trim());
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b, "id"));
  }, [items]);

  const filtered = useMemo(() => {
    let list = items;
    if (categoryFilter) {
      list = list.filter((i) => (i.category ?? "").trim() === categoryFilter);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          (i.description ?? "").toLowerCase().includes(q) ||
          i.price.toLowerCase().includes(q) ||
          (i.category ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [items, categoryFilter, searchQuery]);

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-wide">
            Marketplace
          </h1>
          <p className="text-sm text-white/60 mt-1">
            Klik produk untuk lihat detail, tambah ke keranjang, lalu checkout. Bisa juga beli langsung
            di toko penjual.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Link
            href="/dashboard/marketplace/pesanan"
            className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs sm:text-sm text-white/85 hover:bg-white/10 transition-colors"
          >
            <Package size={16} />
            Pesanan saya
          </Link>
          <Link
            href="/dashboard/marketplace/keranjang"
            className="relative inline-flex items-center gap-1.5 rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-xs sm:text-sm text-amber-100 hover:bg-amber-500/15 transition-colors"
          >
            <ShoppingCart size={16} />
            Keranjang
            {cartCount > 0 ? (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-teal-500 text-[10px] font-semibold text-white px-1">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            ) : null}
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs sm:text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors"
          >
            Home
          </Link>
          <Link
            href="/dashboard/marketplace-saya"
            className="inline-flex items-center rounded-md bg-cyan-600 hover:bg-cyan-500 px-3 py-1.5 text-xs sm:text-sm text-white transition-colors"
          >
            Kelola produk
          </Link>
        </div>
      </div>

      {!loading && items.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
              size={16}
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, deskripsi, harga, kategori…"
              className="w-full rounded-lg bg-black/30 border border-white/10 pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-teal-500/40"
            />
          </div>
          {categoriesInUse.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[11px] text-white/45 shrink-0">Kategori:</span>
              <button
                type="button"
                onClick={() => setCategoryFilter("")}
                className={`rounded-full px-3 py-1 text-xs border transition-colors ${
                  categoryFilter === ""
                    ? "border-teal-500/50 bg-teal-500/15 text-teal-200"
                    : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
                }`}
              >
                Semua
              </button>
              {categoriesInUse.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategoryFilter(categoryFilter === c ? "" : c)}
                  className={`rounded-full px-3 py-1 text-xs border transition-colors ${
                    categoryFilter === c
                      ? "border-teal-500/50 bg-teal-500/15 text-teal-200"
                      : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-white/50">Memuat katalog…</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/60">
          Belum ada produk aktif. Penjual dapat menambah produk di{" "}
          <Link href="/dashboard/marketplace-saya" className="text-teal-400 hover:text-teal-300">
            Marketplace Saya
          </Link>
          .
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/60">
          Tidak ada produk yang cocok dengan pencarian atau filter.{" "}
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setCategoryFilter("");
            }}
            className="text-teal-400 hover:text-teal-300"
          >
            Reset filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((item) => {
            const cardInner = (
              <>
                <div className="aspect-square rounded-lg bg-white/5 flex items-center justify-center mb-2 overflow-hidden relative">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover"
                      sizes="(max-width:640px) 45vw, 200px"
                      unoptimized
                    />
                  ) : (
                    <ShoppingBag className="w-10 h-10 text-teal-400/50" />
                  )}
                </div>
                {item.category ? (
                  <span className="inline-block mb-1 text-[10px] px-2 py-0.5 rounded-full border border-white/15 bg-white/5 text-white/60">
                    {item.category}
                  </span>
                ) : null}
                <div className="text-sm font-medium text-white/90 line-clamp-2">{item.title}</div>
                {item.description ? (
                  <p className="text-[11px] text-white/50 mt-1 line-clamp-2">{item.description}</p>
                ) : null}
                <div className="text-sm text-amber-400/90 mt-1">{displayRupiah(item.price)}</div>
                <div className="mt-1.5 text-[11px] text-teal-300/70">Lihat detail →</div>
              </>
            );
            const cls =
              "block rounded-xl border border-white/10 bg-white/[0.04] p-3 hover:bg-white/[0.07] hover:border-teal-500/25 transition-colors no-underline text-left";

            return (
              <Link key={item.id} href={`/dashboard/marketplace/p/${item.id}`} className={cls}>
                {cardInner}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
