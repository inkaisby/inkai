export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { notifyFeedPublished } from "@/app/lib/events/notifyFeedPublished";

type Status = "draft" | "published";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("home_feed")
    .select("id, title, body, image_path, type, likes, order_index, status, created_at")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[API konten/berita GET]", error);
    return NextResponse.json({ message: "Gagal memuat" }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const content = typeof body?.body === "string" ? body.body.trim() : "";
  const type = typeof body?.type === "string" ? body.type.trim() : "pengumuman";
  const status: Status = body?.status === "published" ? "published" : "draft";

  if (!title || !content) {
    return NextResponse.json({ message: "Judul dan isi wajib" }, { status: 400 });
  }
  if (!["event", "pengumuman", "dojo"].includes(type)) {
    return NextResponse.json({ message: "type tidak valid" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("home_feed")
    .insert({
      title,
      body: content,
      type,
      status,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[API konten/berita POST]", error);
    return NextResponse.json(
      { message: "Gagal membuat", detail: error.message },
      { status: 500 },
    );
  }

  const newId = data?.id ?? null;
  if (status === "published" && newId) {
    await notifyFeedPublished(supabase, {
      feedId: newId,
      title,
      authorUserId: user.id,
    });
  }

  return NextResponse.json({ ok: true, id: newId });
}

