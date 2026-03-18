/** Label UI untuk home_marketplace_orders */

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  transfer_bank: "Transfer bank",
  ewallet: "E-wallet / QRIS",
  cod: "COD / bayar di tempat",
  other: "Lainnya",
};

export const ORDER_STATUS_LABEL: Record<string, string> = {
  menunggu: "Menunggu",
  diproses: "Diproses",
  dikirim: "Dikirim",
  komplain: "Komplain",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

export const ORDER_STATUS_FLOW = [
  "menunggu",
  "diproses",
  "dikirim",
  "komplain",
  "selesai",
  "dibatalkan",
] as const;

export type OrderStatus = (typeof ORDER_STATUS_FLOW)[number];
