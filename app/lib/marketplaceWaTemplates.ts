export type MarketplaceWaOrderItem = {
  title: string;
  qty: number;
};

function fmtIdShort(id: string) {
  const s = String(id || "");
  return s.length > 12 ? `${s.slice(0, 8)}…${s.slice(-4)}` : s;
}

function fmtDateTimeId(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

export function buyerToSellerWaMessage(params: {
  sellerName: string;
  orderId: string;
  createdAtIso: string;
  proofUrl: string;
  items: MarketplaceWaOrderItem[];
  totalLabel: string;
}) {
  const list = params.items
    .map((it) => `- ${it.title} × ${it.qty}`)
    .join("\n");

  return (
    `Hai, saya sudah melakukan pemesanan pada:\n` +
    `- Toko ${params.sellerName}\n` +
    `- Transaksi ${fmtIdShort(params.orderId)}\n` +
    `- Tanggal & Jam ${fmtDateTimeId(params.createdAtIso)} WIB\n\n` +
    `Rincian pesanan:\n${list}\n\n` +
    `Total: ${params.totalLabel}\n\n` +
    `Untuk bukti pemesanan sebagai berikut:\n${params.proofUrl}\n\n` +
    `Mohon untuk segera dilakukan konfirmasi. Terima kasih`
  );
}

export function sellerToBuyerWaMessage(params: {
  buyerName: string;
  orderId: string;
  createdAtIso: string;
  proofUrl: string;
  items: MarketplaceWaOrderItem[];
  totalLabel: string;
}) {
  const list = params.items
    .map((it) => `- ${it.title} × ${it.qty}`)
    .join("\n");

  return (
    `Hai ${params.buyerName}, kami dari penjual ingin konfirmasi pesanan Anda:\n` +
    `- Transaksi ${fmtIdShort(params.orderId)}\n` +
    `- Tanggal & Jam ${fmtDateTimeId(params.createdAtIso)} WIB\n\n` +
    `Rincian pesanan:\n${list}\n\n` +
    `Total: ${params.totalLabel}\n\n` +
    `Bukti/Detail pesanan:\n${params.proofUrl}\n\n` +
    `Silakan balas pesan ini untuk konfirmasi pembayaran dan alamat pengiriman. Terima kasih`
  );
}
