"use client";

import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import {
  useMarketplaceCartStore,
  type MarketplaceCartLine,
  isLineSelected,
} from "@/app/dashboard/store/marketplaceCartStore";
import { displayRupiah, digitsFromPriceString, formatRupiahFromDigits } from "@/app/lib/formatRupiah";

function lineSubtotal(line: MarketplaceCartLine): bigint {
  const unit = BigInt(digitsFromPriceString(line.price) || "0");
  return unit * BigInt(line.qty);
}

export default function MarketplaceCartModule() {
  const lines = useMarketplaceCartStore((s) => s.lines);
  const setLineQty = useMarketplaceCartStore((s) => s.setLineQty);
  const removeLine = useMarketplaceCartStore((s) => s.removeLine);
  const toggleLineSelected = useMarketplaceCartStore((s) => s.toggleLineSelected);
  const setAllSelected = useMarketplaceCartStore((s) => s.setAllSelected);

  const selectedLines = lines.filter(isLineSelected);
  const allSelected = lines.length > 0 && selectedLines.length === lines.length;
  const someSelected = selectedLines.length > 0;

  const totalSelected = selectedLines.reduce((a, l) => a + lineSubtotal(l), BigInt(0));
  const totalLabel = someSelected
    ? formatRupiahFromDigits(totalSelected.toString())
    : "Rp 0";

  return (
    <div className="space-y-6 pb-10 max-w-2xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-semibold text-white">Keranjang</h1>
        <Link
          href="/dashboard/marketplace"
          className="text-sm text-teal-400 hover:text-teal-300"
        >
          Lanjut belanja
        </Link>
      </div>

      {lines.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <ShoppingBag className="w-12 h-12 mx-auto text-white/20 mb-3" />
          <p className="text-white/55 text-sm">Keranjang masih kosong.</p>
          <Link
            href="/dashboard/marketplace"
            className="inline-block mt-4 rounded-lg bg-teal-600 hover:bg-teal-500 px-4 py-2 text-sm text-white"
          >
            Lihat katalog
          </Link>
        </div>
      ) : (
        <>
          <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer select-none">
            <input
              type="checkbox"
              className="rounded border-white/25 bg-black/40 text-teal-500 focus:ring-teal-500/40 w-4 h-4"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected && !allSelected;
              }}
              onChange={() => setAllSelected(!allSelected)}
            />
            Pilih semua untuk checkout
          </label>

          <ul className="space-y-3">
            {lines.map((line) => {
              const sel = isLineSelected(line);
              return (
                <li
                  key={line.productId}
                  className={`flex gap-2 sm:gap-3 rounded-xl border p-3 transition-colors ${
                    sel
                      ? "border-teal-500/25 bg-teal-500/[0.06]"
                      : "border-white/10 bg-white/[0.04] opacity-80"
                  }`}
                >
                  <div className="flex items-start pt-1">
                    <input
                      type="checkbox"
                      className="rounded border-white/25 bg-black/40 text-teal-500 focus:ring-teal-500/40 w-4 h-4 mt-0.5 shrink-0"
                      checked={sel}
                      onChange={() => toggleLineSelected(line.productId)}
                      aria-label={`Pilih ${line.title}`}
                    />
                  </div>
                  <Link
                    href={`/dashboard/marketplace/p/${line.productId}`}
                    className="relative w-16 h-16 rounded-lg overflow-hidden bg-black/30 flex-shrink-0"
                  >
                    {line.image ? (
                      <Image
                        src={line.image}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="64px"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-6 h-6 text-white/25" />
                      </div>
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/dashboard/marketplace/p/${line.productId}`}
                      className="text-sm font-medium text-white hover:text-teal-300 line-clamp-2"
                    >
                      {line.title}
                    </Link>
                    <div className="text-xs text-amber-300/90 mt-0.5">
                      {displayRupiah(line.price)} × {line.qty}
                      {sel ? (
                        <span className="text-white/40 ml-1">
                          ={" "}
                          {formatRupiahFromDigits(lineSubtotal(line).toString())}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center rounded-md border border-white/15 bg-black/30">
                        <button
                          type="button"
                          className="p-1 text-white/70 hover:bg-white/10"
                          onClick={() => setLineQty(line.productId, line.qty - 1)}
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-7 text-center text-xs text-white">{line.qty}</span>
                        <button
                          type="button"
                          className="p-1 text-white/70 hover:bg-white/10"
                          onClick={() => setLineQty(line.productId, line.qty + 1)}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLine(line.productId)}
                        className="p-1.5 text-red-400/80 hover:text-red-300 hover:bg-red-500/10 rounded-md"
                        title="Hapus"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="rounded-xl border border-white/10 bg-white/[0.05] p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">Total item terpilih</span>
              <span className="text-lg font-semibold text-amber-400">{totalLabel}</span>
            </div>
            <p className="text-[11px] text-white/40">
              {someSelected
                ? `${selectedLines.length} produk akan dibawa ke checkout.`
                : "Centang produk yang ingin dibeli."}
            </p>
          </div>

          {someSelected ? (
            <Link
              href="/dashboard/marketplace/checkout"
              className="block w-full text-center rounded-xl bg-teal-600 hover:bg-teal-500 py-3 text-sm font-medium text-white"
            >
              Checkout ({selectedLines.length} item)
            </Link>
          ) : (
            <p className="text-center text-sm text-amber-200/70 rounded-xl border border-amber-500/20 bg-amber-500/5 py-3">
              Centang minimal satu produk untuk melanjutkan checkout.
            </p>
          )}
        </>
      )}
    </div>
  );
}
