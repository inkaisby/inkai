import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { isValidUuid } from "@/app/lib/security/validateUuid";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type InvoiceItem = {
  product_id: string;
  title: string;
  price: string;
  qty: number;
  href: string;
};

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id: orderId } = await ctx.params;
  if (!isValidUuid(orderId)) {
    return NextResponse.json({ message: "Pesanan tidak valid" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: order, error } = await admin
    .from("home_marketplace_orders")
    .select(
      "id, buyer_id, seller_user_id, created_at, status, customer_name, customer_phone, shipping_address, payment_method, notes, items",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error || !order) {
    return NextResponse.json({ message: "Pesanan tidak ditemukan" }, { status: 404 });
  }
  if (order.buyer_id !== user.id) {
    return NextResponse.json({ message: "Akses ditolak" }, { status: 403 });
  }

  // Resolve seller name (best effort).
  let sellerName = "Penjual";
  const sellerId = (order as unknown as { seller_user_id?: string | null }).seller_user_id ?? null;

  if (sellerId) {
    const { data: prof } = await admin
      .from("profiles")
      .select("nama")
      .eq("user_id", sellerId)
      .maybeSingle();
    const n = (prof as { nama?: string | null } | null)?.nama?.trim();
    if (n) sellerName = n;
  } else {
    // Fallback: infer from first product's created_by
    const items = (order.items ?? []) as unknown as InvoiceItem[];
    const firstId = items?.[0]?.product_id;
    if (isValidUuid(String(firstId ?? ""))) {
      const { data: p } = await admin
        .from("home_marketplace")
        .select("created_by")
        .eq("id", firstId)
        .maybeSingle();
      const createdBy = (p as { created_by?: string | null } | null)?.created_by ?? null;
      if (createdBy) {
        const { data: prof } = await admin
          .from("profiles")
          .select("nama")
          .eq("user_id", createdBy)
          .maybeSingle();
        const n = (prof as { nama?: string | null } | null)?.nama?.trim();
        if (n) sellerName = n;
      }
    }
  }

  return NextResponse.json({
    invoice: {
      id: order.id,
      created_at: order.created_at,
      status: order.status ?? "menunggu",
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      shipping_address: order.shipping_address ?? null,
      payment_method: order.payment_method ?? null,
      notes: order.notes ?? null,
      items: Array.isArray(order.items) ? order.items : [],
      seller_name: sellerName,
    },
  });
}

