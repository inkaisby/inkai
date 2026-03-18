import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ItemRow = { product_id?: string };

function orderTouchesSeller(
  items: unknown,
  sellerProductIds: Set<string>,
): boolean {
  if (!Array.isArray(items)) return false;
  return (items as ItemRow[]).some((it) => sellerProductIds.has(String(it.product_id ?? "")));
}

function filterItemsForSeller(items: unknown, sellerProductIds: Set<string>): ItemRow[] {
  if (!Array.isArray(items)) return [];
  return (items as ItemRow[]).filter((it) => sellerProductIds.has(String(it.product_id ?? "")));
}

/** Pesanan yang mengandung produk milik user (penjual). Superadmin: semua pesanan. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { data: prof } = await admin
    .from("profiles")
    .select("app_role")
    .eq("user_id", user.id)
    .maybeSingle();
  const isSuperAdmin = String(prof?.app_role ?? "").toUpperCase() === "SUPERADMIN";

  const { data: myProducts } = await admin
    .from("home_marketplace")
    .select("id")
    .eq("created_by", user.id);

  const myIds = new Set((myProducts ?? []).map((p: { id: string }) => p.id));

  const { data: allOrders, error } = await admin
    .from("home_marketplace_orders")
    .select(
      "id, created_at, status, buyer_id, customer_name, customer_phone, shipping_address, payment_method, notes, items",
    )
    .order("created_at", { ascending: false })
    .limit(250);

  if (error) {
    console.error("[GET konten/marketplace/incoming-orders]", error);
    return NextResponse.json({ message: "Gagal memuat pesanan" }, { status: 500 });
  }

  const rows = allOrders ?? [];

  if (isSuperAdmin) {
    return NextResponse.json({
      orders: rows.map((o) => ({
        ...o,
        my_items: o.items,
        is_mixed_seller: false,
      })),
      is_superadmin: true,
    });
  }

  if (myIds.size === 0) {
    return NextResponse.json({ orders: [], is_superadmin: false });
  }

  const filtered = rows.filter((o) => orderTouchesSeller(o.items, myIds));

  const enriched = filtered.map((o) => {
    const mine = filterItemsForSeller(o.items, myIds);
    const all = Array.isArray(o.items) ? o.items.length : 0;
    return {
      ...o,
      my_items: mine,
      is_mixed_seller: all > mine.length,
    };
  });

  return NextResponse.json({ orders: enriched, is_superadmin: false });
}
