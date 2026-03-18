/**
 * GET: Katalog marketplace — semua produk aktif (untuk halaman /dashboard/marketplace).
 */
import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("home_marketplace")
    .select("id, title, price, image_path, href, description, category")
    .eq("is_active", true)
    .order("order_index", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[API home/marketplace GET]", error);
    return NextResponse.json({ message: "Gagal memuat" }, { status: 500 });
  }

  const items = (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id,
    title: r.title ?? "",
    price: r.price ?? "",
    image: (r.image_path as string) || null,
    href: (r.href as string) || "/dashboard",
    description: (r.description as string) || null,
    category: (r.category as string) || "",
  }));

  return NextResponse.json({ items });
}
