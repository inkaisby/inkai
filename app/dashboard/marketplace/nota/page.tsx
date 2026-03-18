import MarketplaceInvoiceModule from "../../modules/konten/MarketplaceInvoiceModule";

export default function Page({
  searchParams,
}: {
  searchParams?: { order?: string };
}) {
  const orderId = searchParams?.order ?? "";
  return <MarketplaceInvoiceModule orderId={orderId} />;
}

