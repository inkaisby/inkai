import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { isValidUuid } from "@/app/lib/security/validateUuid";

export const runtime = "nodejs";

type Line = { product_id: string; title: string; price: string; qty: number; href: string };

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const customer_name = typeof body?.customer_name === "string" ? body.customer_name.trim() : "";
  const customer_phone = typeof body?.customer_phone === "string" ? body.customer_phone.trim() : "";
  const shipping_address =
    typeof body?.shipping_address === "string" ? body.shipping_address.trim() : "";
  const notes = typeof body?.notes === "string" ? body.notes.trim().slice(0, 500) : "";
  const payment_method_raw =
    typeof body?.payment_method === "string" ? body.payment_method.trim().slice(0, 80) : "";
  const allowedPay = new Set(["transfer_bank", "ewallet", "cod", "other"]);
  const payment_method = allowedPay.has(payment_method_raw) ? payment_method_raw : "";
  const rawItems = body?.items;

  if (!customer_name || !customer_phone) {
    return NextResponse.json({ message: "Nama dan nomor HP wajib diisi." }, { status: 400 });
  }
  if (!payment_method) {
    return NextResponse.json({ message: "Pilih metode pembayaran." }, { status: 400 });
  }

  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return NextResponse.json({ message: "Keranjang kosong." }, { status: 400 });
  }

  const items: Line[] = [];
  for (const row of rawItems) {
    const product_id = typeof row?.product_id === "string" ? row.product_id : "";
    const title = typeof row?.title === "string" ? row.title.trim() : "";
    const price = typeof row?.price === "string" ? row.price.trim() : "";
    const href = typeof row?.href === "string" ? row.href.trim() : "/dashboard";
    const qty = Number(row?.qty);
    if (!isValidUuid(product_id) || !title || !price || !Number.isFinite(qty) || qty < 1 || qty > 99) {
      return NextResponse.json({ message: "Data item tidak valid." }, { status: 400 });
    }
    items.push({ product_id, title, price, qty, href });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("home_marketplace_orders")
    .insert({
      buyer_id: user.id,
      customer_name,
      customer_phone,
      shipping_address: shipping_address || null,
      notes: notes || null,
      payment_method,
      items: items as unknown as Record<string, unknown>,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[API home/marketplace/order]", error);
    const missing =
      error.message?.includes("does not exist") || error.message?.includes("relation");
    return NextResponse.json(
      {
        message: missing
          ? "Tabel pesanan belum ada. Jalankan migrasi home_marketplace_orders di Supabase."
          : "Gagal menyimpan pesanan.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, order_id: data?.id ?? null });
}
