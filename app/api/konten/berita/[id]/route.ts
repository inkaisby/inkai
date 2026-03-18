export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { isValidUuid } from "@/app/lib/security/validateUuid";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { notifyFeedPublished } from "@/app/lib/events/notifyFeedPublished";

type Status = "draft" | "published";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  if (!isValidUuid(id)) return NextResponse.json({ message: "id tidak valid" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const payload: Record<string, unknown> = {};

  if (typeof body?.title === "string") payload.title = body.title.trim();
  if (typeof body?.body === "string") payload.body = body.body.trim();
  if (typeof body?.image_path === "string") payload.image_path = body.image_path.trim() || null;
  if (typeof body?.type === "string" && ["event", "pengumuman", "dojo"].includes(body.type)) {
    payload.type = body.type;
  }
  if (body?.status === "draft" || body?.status === "published") {
    payload.status = body.status as Status;
  }
  if (typeof body?.order_index === "number" && Number.isFinite(body.order_index)) {
    payload.order_index = Math.trunc(body.order_index);
  }

  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ message: "Tidak ada perubahan" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  let notifyOnPublish = false;
  let publishTitle = "";
  let publishAuthor: string | null = null;
  if (payload.status === "published") {
    const { data: existing } = await supabase
      .from("home_feed")
      .select("status, title, created_by")
      .eq("id", id)
      .maybeSingle();
    if (existing && (existing as { status?: string }).status === "draft") {
      notifyOnPublish = true;
      publishTitle =
        (typeof payload.title === "string" ? payload.title : (existing as { title?: string }).title) ||
        "";
      publishAuthor = (existing as { created_by?: string | null }).created_by ?? user.id;
    }
  }

  const { error } = await supabase.from("home_feed").update(payload).eq("id", id);

  if (error) {
    console.error("[API konten/berita PATCH]", error);
    return NextResponse.json({ message: "Gagal update" }, { status: 500 });
  }

  if (notifyOnPublish) {
    await notifyFeedPublished(supabase, {
      feedId: id,
      title: publishTitle,
      authorUserId: publishAuthor,
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  if (!isValidUuid(id)) return NextResponse.json({ message: "id tidak valid" }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("home_feed").delete().eq("id", id);

  if (error) {
    console.error("[API konten/berita DELETE]", error);
    return NextResponse.json({ message: "Gagal hapus" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

