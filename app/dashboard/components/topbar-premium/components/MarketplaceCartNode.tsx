"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import { useMarketplaceCartCount } from "@/app/dashboard/store/marketplaceCartStore";

export default function MarketplaceCartNode() {
  const cartCount = useMarketplaceCartCount();

  return (
    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
      <Link
        href="/dashboard/marketplace/keranjang"
        title="Keranjang Marketplace"
        className="
          relative flex shrink-0 cursor-pointer items-center justify-center p-2.5 rounded-xl
          bg-gradient-to-br from-amber-500/[0.08] to-white/[0.02]
          hover:from-amber-500/15 hover:to-amber-500/5
          border border-amber-500/20 hover:border-amber-400/45
          shadow-[0_2px_12px_rgba(0,0,0,0.3)]
          transition-colors duration-200
        "
        aria-label={
          cartCount > 0
            ? `Keranjang Marketplace, ${cartCount} item`
            : "Keranjang Marketplace"
        }
      >
        <ShoppingCart
          size={20}
          className="text-amber-200/90"
          aria-hidden
        />
        {cartCount > 0 ? (
          <span
            className="
              absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center
              rounded-full bg-teal-500 text-[10px] font-semibold text-white px-1
              shadow-[0_0_8px_rgba(20,184,166,0.5)]
            "
          >
            {cartCount > 99 ? "99+" : cartCount}
          </span>
        ) : null}
      </Link>
    </motion.div>
  );
}
