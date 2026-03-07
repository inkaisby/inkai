/**
 * GET: Feed dan marketplace untuk Dashboard Home.
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

  const [feedRes, marketplaceRes] = await Promise.all([
    admin
      .from("home_feed")
      .select("id, title, body, image_path, type, likes, created_at")
      .order("order_index", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("home_marketplace")
      .select("id, title, price, image_path, href")
      .order("order_index", { ascending: false })
      .limit(20),
  ]);

  const feed = (feedRes.data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id,
    title: r.title ?? "",
    body: r.body ?? "",
    image: (r.image_path as string) || null,
    date: r.created_at,
    likes: Number(r.likes ?? 0),
    type: r.type as "event" | "pengumuman" | "dojo",
  }));

  const marketplace = (marketplaceRes.data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id,
    title: r.title ?? "",
    price: r.price ?? "",
    image: (r.image_path as string) || null,
    href: (r.href as string) || "/dashboard",
  }));

  return NextResponse.json({ feed, marketplace });
}
