import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { isValidUuid } from "@/app/lib/security/validateUuid";
import { ORDER_STATUS_FLOW, type OrderStatus } from "@/app/lib/marketplaceOrderLabels";

export const runtime = "nodejs";

type ItemRow = { product_id?: string };

function orderTouchesSeller(items: unknown, sellerProductIds: Set<string>): boolean {
  if (!Array.isArray(items)) return false;
  return (items as ItemRow[]).some((it) => sellerProductIds.has(String(it.product_id ?? "")));
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id: orderId } = await ctx.params;
  if (!isValidUuid(orderId)) {
    return NextResponse.json({ message: "Pesanan tidak valid" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const nextStatus = typeof body?.status === "string" ? body.status.trim() : "";
  if (!ORDER_STATUS_FLOW.includes(nextStatus as OrderStatus)) {
    return NextResponse.json({ message: "Status tidak valid" }, { status: 400 });
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

  const { data: order, error: fetchErr } = await admin
    .from("home_marketplace_orders")
    .select("id, items")
    .eq("id", orderId)
    .maybeSingle();

  if (fetchErr || !order) {
    return NextResponse.json({ message: "Pesanan tidak ditemukan" }, { status: 404 });
  }

  if (!isSuperAdmin && !orderTouchesSeller(order.items, myIds)) {
    return NextResponse.json({ message: "Akses ditolak" }, { status: 403 });
  }

  const { error: updErr } = await admin
    .from("home_marketplace_orders")
    .update({ status: nextStatus })
    .eq("id", orderId);

  if (updErr) {
    console.error("[PATCH incoming-orders]", updErr);
    if (updErr.message?.includes("status") || updErr.message?.includes("check")) {
      return NextResponse.json(
        {
          message:
            "Kolom status belum ada di database. Jalankan migrasi fix_marketplace_orders_status.sql",
        },
        { status: 500 },
      );
    }
    return NextResponse.json({ message: "Gagal memperbarui status" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: nextStatus });
}
