export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("home_marketplace")
    .select("id, title, price, image_path, href, order_index, is_active, created_at")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[API konten/marketplace GET]", error);
    return NextResponse.json({ message: "Gagal memuat" }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const price = typeof body?.price === "string" ? body.price.trim() : "";
  const href = typeof body?.href === "string" ? body.href.trim() : "";
  const is_active = body?.is_active === false ? false : true;

  if (!title || !price) {
    return NextResponse.json({ message: "Nama produk dan harga wajib" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("home_marketplace")
    .insert({
      title,
      price,
      href: href || "/dashboard",
      is_active,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[API konten/marketplace POST]", error);
    return NextResponse.json({ message: "Gagal membuat" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data?.id ?? null });
}

