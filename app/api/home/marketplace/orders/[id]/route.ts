import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { isValidUuid } from "@/app/lib/security/validateUuid";

export const runtime = "nodejs";

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

  const admin = createSupabaseAdminClient();

  const body = await req.json().catch(() => ({}));
  const requestedStatus = typeof body?.status === "string" ? body.status.trim() : "";

  const { data: order, error: fetchErr } = await admin
    .from("home_marketplace_orders")
    .select("id, buyer_id, status")
    .eq("id", orderId)
    .maybeSingle();

  if (fetchErr || !order) {
    return NextResponse.json({ message: "Pesanan tidak ditemukan" }, { status: 404 });
  }

  if (order.buyer_id !== user.id) {
    return NextResponse.json({ message: "Akses ditolak" }, { status: 403 });
  }

  const currentStatus = order.status as string | null;
  // Mode 1: pembeli konfirmasi setelah dikirim (atau selesaikan setelah komplain)
  if (requestedStatus) {
    if (requestedStatus !== "selesai" && requestedStatus !== "komplain") {
      return NextResponse.json({ message: "Status tidak valid." }, { status: 400 });
    }
    if (requestedStatus === "komplain" && currentStatus !== "dikirim") {
      return NextResponse.json(
        { message: "Komplain hanya bisa dibuat setelah status dikirim." },
        { status: 400 },
      );
    }
    if (requestedStatus === "selesai" && currentStatus !== "dikirim" && currentStatus !== "komplain") {
      return NextResponse.json(
        { message: "Pesanan hanya bisa diselesaikan setelah dikirim atau saat komplain." },
        { status: 400 },
      );
    }
    const { error: updErr } = await admin
      .from("home_marketplace_orders")
      .update({ status: requestedStatus })
      .eq("id", orderId);

    if (updErr) {
      console.error("[PATCH home/marketplace/orders/:id]", updErr);
      if (updErr.message?.includes("status") || updErr.message?.includes("check")) {
        return NextResponse.json(
          {
            message:
              "Status belum dikenali database. Jalankan migrasi fix_marketplace_orders_status.sql (tambahkan komplain).",
          },
          { status: 500 },
        );
      }
      return NextResponse.json(
        { message: "Gagal memperbarui status pesanan." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, status: requestedStatus });
  }

  // Mode 2: pembeli membatalkan sebelum dikirim (legacy: PATCH tanpa body)
  if (currentStatus === "selesai" || currentStatus === "dibatalkan") {
    return NextResponse.json(
      { message: "Pesanan sudah tidak bisa dibatalkan." },
      { status: 400 },
    );
  }
  if (currentStatus !== "menunggu" && currentStatus !== "diproses") {
    return NextResponse.json(
      { message: "Pesanan tidak bisa dibatalkan setelah dikirim." },
      { status: 400 },
    );
  }

  const { error: updErr } = await admin
    .from("home_marketplace_orders")
    .update({ status: "dibatalkan" })
    .eq("id", orderId);

  if (updErr) {
    console.error("[PATCH home/marketplace/orders/:id]", updErr);
    if (updErr.message?.includes("status") || updErr.message?.includes("check")) {
      return NextResponse.json(
        {
          message:
            "Kolom status belum ada di database. Jalankan migrasi fix_marketplace_orders_status.sql",
        },
        { status: 500 },
      );
    }
    return NextResponse.json({ message: "Gagal membatalkan pesanan." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: "dibatalkan" });
}

export async function DELETE(
  _req: NextRequest,
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

  const admin = createSupabaseAdminClient();

  const { data: order, error: fetchErr } = await admin
    .from("home_marketplace_orders")
    .select("id, buyer_id, status")
    .eq("id", orderId)
    .maybeSingle();

  if (fetchErr || !order) {
    return NextResponse.json({ message: "Pesanan tidak ditemukan" }, { status: 404 });
  }

  if (order.buyer_id !== user.id) {
    return NextResponse.json({ message: "Akses ditolak" }, { status: 403 });
  }

  const currentStatus = order.status as string | null;
  if (currentStatus !== "dibatalkan" && currentStatus !== "selesai") {
    return NextResponse.json(
      {
        message:
          "Hanya pesanan yang sudah selesai atau dibatalkan yang bisa dihapus dari riwayat.",
      },
      { status: 400 },
    );
  }

  const { error: delErr } = await admin
    .from("home_marketplace_orders")
    .delete()
    .eq("id", orderId);

  if (delErr) {
    console.error("[DELETE home/marketplace/orders/:id]", delErr);
    return NextResponse.json({ message: "Gagal menghapus pesanan." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

