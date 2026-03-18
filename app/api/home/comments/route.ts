export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { isValidUuid } from "@/app/lib/security/validateUuid";
import { insertEvent } from "@/app/lib/events/insertEvent";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const feedId = searchParams.get("feedId") ?? "";

  if (!isValidUuid(feedId)) {
    return NextResponse.json({ message: "feedId tidak valid" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("home_feed_comments")
    .select("id, feed_id, user_id, author_name, body, created_at")
    .eq("feed_id", feedId)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) {
    console.error("[API home/comments GET]", error);
    return NextResponse.json({ message: "Gagal memuat komentar" }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const feedId = typeof body?.feedId === "string" ? body.feedId : "";
  const text = typeof body?.text === "string" ? body.text.trim() : "";

  if (!isValidUuid(feedId)) {
    return NextResponse.json({ message: "feedId tidak valid" }, { status: 400 });
  }
  if (!text) {
    return NextResponse.json({ message: "Komentar tidak boleh kosong" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const authorName =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    (user.email as string | undefined) ||
    "Anggota";
  const { data, error } = await supabase
    .from("home_feed_comments")
    .insert({
      feed_id: feedId,
      user_id: user.id,
      author_name: authorName,
      body: text,
    })
    .select("id, feed_id, user_id, author_name, body, created_at")
    .single();

  if (error) {
    console.error("[API home/comments POST]", error);
    return NextResponse.json({ message: "Gagal membuat komentar", detail: error.message }, { status: 500 });
  }

  const { data: feedRow } = await supabase
    .from("home_feed")
    .select("created_by, title")
    .eq("id", feedId)
    .maybeSingle();
  const ownerId = feedRow?.created_by as string | null | undefined;
  if (ownerId && ownerId !== user.id) {
    const t = (feedRow?.title as string | undefined)?.trim() || "postingan Anda";
    await insertEvent(supabase, {
      user_id: ownerId,
      type: "feed_comment",
      title: `${authorName} mengomentari: ${t.length > 80 ? `${t.slice(0, 80)}…` : t}`,
      module: "home_feed",
      link: `/dashboard#post-${feedId}`,
    });
  }

  return NextResponse.json({ item: data });
}

