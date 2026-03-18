import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { isValidUuid } from "@/app/lib/security/validateUuid";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ message: "Produk tidak valid" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("home_marketplace")
    .select("id, title, price, image_path, href, description, category")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("[API home/marketplace/item]", error);
    return NextResponse.json({ message: "Gagal memuat" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ message: "Produk tidak ditemukan" }, { status: 404 });
  }

  const r = data as Record<string, unknown>;
  return NextResponse.json({
    item: {
      id: r.id,
      title: r.title ?? "",
      price: r.price ?? "",
      image: (r.image_path as string) || null,
      href: (r.href as string) || "/dashboard",
      description: (r.description as string) || null,
      category: (r.category as string) || "",
    },
  });
}
