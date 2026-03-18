import { create } from "zustand";
import { persist } from "zustand/middleware";

export type MarketplaceCartLine = {
  productId: string;
  title: string;
  price: string;
  image: string | null;
  href: string;
  qty: number;
  /** Untuk checkout — default true jika tidak ada (data lama) */
  selected?: boolean;
};

export function isLineSelected(line: MarketplaceCartLine): boolean {
  return line.selected !== false;
}

type CartState = {
  lines: MarketplaceCartLine[];
  addLine: (line: Omit<MarketplaceCartLine, "qty" | "selected"> & { qty?: number }) => void;
  setLineQty: (productId: string, qty: number) => void;
  toggleLineSelected: (productId: string) => void;
  setAllSelected: (value: boolean) => void;
  removeLine: (productId: string) => void;
  removeLinesByIds: (productIds: string[]) => void;
  clear: () => void;
};

export const useMarketplaceCartStore = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      addLine: (line) => {
        const q = Math.min(99, Math.max(1, line.qty ?? 1));
        set((s) => {
          const idx = s.lines.findIndex((l) => l.productId === line.productId);
          if (idx >= 0) {
            const next = [...s.lines];
            next[idx] = {
              ...next[idx],
              qty: Math.min(99, next[idx].qty + q),
              title: line.title,
              price: line.price,
              image: line.image,
              href: line.href,
            };
            return { lines: next };
          }
          return {
            lines: [
              ...s.lines,
              {
                productId: line.productId,
                title: line.title,
                price: line.price,
                image: line.image,
                href: line.href,
                qty: q,
                selected: true,
              },
            ],
          };
        });
      },
      setLineQty: (productId, qty) =>
        set((s) => {
          if (qty < 1) {
            return { lines: s.lines.filter((l) => l.productId !== productId) };
          }
          return {
            lines: s.lines.map((l) =>
              l.productId === productId ? { ...l, qty: Math.min(99, qty) } : l,
            ),
          };
        }),
      toggleLineSelected: (productId) =>
        set((s) => ({
          lines: s.lines.map((l) =>
            l.productId === productId
              ? { ...l, selected: !isLineSelected(l) }
              : l,
          ),
        })),
      setAllSelected: (value) =>
        set((s) => ({
          lines: s.lines.map((l) => ({ ...l, selected: value })),
        })),
      removeLine: (productId) =>
        set((s) => ({ lines: s.lines.filter((l) => l.productId !== productId) })),
      removeLinesByIds: (productIds) =>
        set((s) => {
          const setId = new Set(productIds);
          return { lines: s.lines.filter((l) => !setId.has(l.productId)) };
        }),
      clear: () => set({ lines: [] }),
    }),
    {
      name: "inkai-marketplace-cart",
      version: 2,
      migrate: (persistedState) => {
        if (
          persistedState &&
          typeof persistedState === "object" &&
          Array.isArray((persistedState as { lines?: unknown }).lines)
        ) {
          const lines = (persistedState as { lines: MarketplaceCartLine[] }).lines.map(
            (l) => ({
              ...l,
              selected: l.selected !== false,
            }),
          );
          return { lines };
        }
        return { lines: [] };
      },
    },
  ),
);

export function useMarketplaceCartCount(): number {
  return useMarketplaceCartStore((s) => s.lines.reduce((a, l) => a + l.qty, 0));
}
