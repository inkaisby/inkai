export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";

type Status = "draft" | "published";

async function getInstagramThumbnail(postUrl: string): Promise<string | null> {
  try {
    const u = new URL("https://www.instagram.com/oembed/");
    u.searchParams.set("url", postUrl);
    // oEmbed is public but can be rate-limited; keep it best-effort.
    const res = await fetch(u.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json().catch(() => null)) as { thumbnail_url?: unknown } | null;
    return typeof json?.thumbnail_url === "string" && json.thumbnail_url.trim()
      ? json.thumbnail_url.trim()
      : null;
  } catch {
    return null;
  }
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("home_instagram_feed")
    .select("id, image_url, caption, post_url, order_index, status, created_at")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[API konten/instagram GET]", error);
    return NextResponse.json({ message: "Gagal memuat" }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const post_url = typeof body?.post_url === "string" ? body.post_url.trim() : "";
  const caption = typeof body?.caption === "string" ? body.caption.trim() : "";
  const status: Status = body?.status === "published" ? "published" : "draft";

  if (!post_url) {
    return NextResponse.json({ message: "post_url wajib" }, { status: 400 });
  }

  // Guard: link harus ke post (bukan profile). Tetap longgar untuk reel/tv.
  try {
    const u = new URL(post_url);
    const p = u.pathname ?? "";
    const isPostLike =
      p.includes("/p/") || p.includes("/reel/") || p.includes("/tv/");
    if (!isPostLike) {
      return NextResponse.json(
        { message: "Gunakan link post Instagram (contoh: /p/xxxxx atau /reel/xxxxx)" },
        { status: 400 },
      );
    }
  } catch {
    return NextResponse.json({ message: "post_url tidak valid" }, { status: 400 });
  }

  const image_url =
    (await getInstagramThumbnail(post_url)) ??
    "https://placehold.co/400x400/020617/38bdf8?text=Instagram";

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("home_instagram_feed")
    .insert({
      image_url,
      post_url,
      caption: caption || null,
      status,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[API konten/instagram POST]", error);
    return NextResponse.json(
      { message: "Gagal membuat", detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id: data?.id ?? null });
}

