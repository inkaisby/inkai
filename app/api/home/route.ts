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

  const [feedRes, marketplaceRes, igRes] = await Promise.all([
    admin
      .from("home_feed")
      .select("id, title, body, image_path, type, likes, created_at")
      .eq("status", "published")
      .order("order_index", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("home_marketplace")
      .select("id, title, price, image_path, href, description, category")
      .eq("is_active", true)
      .order("order_index", { ascending: false })
      .limit(20),
    admin
      .from("home_instagram_feed")
      .select("id, image_url, caption, post_url")
      .eq("status", "published")
      .order("order_index", { ascending: false })
      .limit(20),
  ]);

  const rawFeed = (feedRes.data ?? []) as Array<{
    id: string;
    title: string;
    body: string;
    image_path: string | null;
    type: "event" | "pengumuman" | "dojo";
    likes: number | null;
    created_at: string;
  }>;

  // Ambil daftar feed yang sudah di-like oleh user ini.
  const likedRes = await admin
    .from("home_feed_likes")
    .select("feed_id")
    .eq("user_id", user.id)
    .in(
      "feed_id",
      rawFeed.length > 0 ? rawFeed.map((f) => f.id) : ["00000000-0000-0000-0000-000000000000"],
    );

  const likedSet = new Set<string>(
    (likedRes.data ?? []).map((r: { feed_id: string }) => r.feed_id),
  );

  const feed = rawFeed.map((r) => ({
    id: r.id,
    title: r.title ?? "",
    body: r.body ?? "",
    image: r.image_path || null,
    date: r.created_at,
    likes: Number(r.likes ?? 0),
    type: r.type,
    liked: likedSet.has(r.id),
  }));

  const marketplace = (marketplaceRes.data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id,
    title: r.title ?? "",
    price: r.price ?? "",
    image: (r.image_path as string) || null,
    href: (r.href as string) || "/dashboard",
    description: (r.description as string) || null,
    category: (r.category as string) || "",
  }));

  const instagramFeed = (igRes.data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id,
    image_url: (r.image_url as string) ?? "",
    caption: (r.caption as string) ?? "",
    post_url: (r.post_url as string) ?? "",
  }));

  return NextResponse.json({ feed, marketplace, instagramFeed });
}
