import { NextResponse } from "next/server";
import { getSessionUser, createSupabaseSessionClient } from "@/app/lib/supabase/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Riwayat pesanan pembeli (RLS: buyer_id = auth.uid()) */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createSupabaseSessionClient();
  const { data, error } = await supabase
    .from("home_marketplace_orders")
    .select(
      "id, created_at, status, customer_name, customer_phone, shipping_address, payment_method, notes, items",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[GET home/marketplace/orders]", error);
    return NextResponse.json({ message: "Gagal memuat pesanan" }, { status: 500 });
  }

  return NextResponse.json({ orders: data ?? [] });
}
