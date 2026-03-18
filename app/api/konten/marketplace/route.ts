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
    .select(
      "id, title, price, image_path, href, description, category, order_index, is_active, created_at",
    )
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
  const image_path =
    typeof body?.image_path === "string" ? body.image_path.trim() || null : null;
  const description =
    typeof body?.description === "string" ? body.description.trim() || null : null;
  const categoryRaw = typeof body?.category === "string" ? body.category.trim().slice(0, 80) : "";
  const category = categoryRaw;
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
      image_path,
      description,
      category,
      is_active,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[API konten/marketplace POST]", error);
    const raw = (error as { message?: string }).message ?? "";
    let message = "Gagal membuat produk.";
    if (/column|does not exist|42703/i.test(raw)) {
      message =
        "Database belum lengkap (kolom tabel). Jalankan migrasi Supabase untuk home_marketplace (category, description, dll.).";
    } else if (raw) {
      message = raw.length < 200 ? raw : message;
    }
    return NextResponse.json({ message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data?.id ?? null });
}

