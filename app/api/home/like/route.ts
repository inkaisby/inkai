export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { insertEvent } from "@/app/lib/events/insertEvent";
/** UUID format standar (v1–v7); lebih longgar dari isValidUuid agar id dari DB selalu diterima. */
function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const id = typeof body?.id === "string" ? body.id.trim() : "";

  if (!isUuidLike(id)) {
    return NextResponse.json({ message: "id tidak valid" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  // Cek apakah user sudah pernah like posting ini.
  const { data: existingLike, error: likeError } = await supabase
    .from("home_feed_likes")
    .select("feed_id")
    .eq("feed_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (likeError) {
    console.error("[API home/like CHECK]", likeError);
    return NextResponse.json({ message: "Gagal memuat status like" }, { status: 500 });
  }

  // Ambil likes saat ini.
  const { data, error } = await supabase
    .from("home_feed")
    .select("likes")
    .eq("id", id)
    .single();

  if (error) {
    console.error("[API home/like SELECT]", error);
    return NextResponse.json({ message: "Gagal memuat likes" }, { status: 500 });
  }

  const currentLikes = Number(data?.likes ?? 0);
  let nextLikes = currentLikes;
  let delta = 0;

  if (existingLike) {
    // Sudah like → unlike: hapus row dan kurangi counter.
    const { error: deleteError } = await supabase
      .from("home_feed_likes")
      .delete()
      .eq("feed_id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("[API home/like DELETE]", deleteError);
      return NextResponse.json({ message: "Gagal menghapus like" }, { status: 500 });
    }

    nextLikes = Math.max(0, currentLikes - 1);
    delta = -1;
  } else {
    // Belum like → like baru.
    const { error: insertError } = await supabase.from("home_feed_likes").insert({
      feed_id: id,
      user_id: user.id,
    });

    if (insertError) {
      console.error("[API home/like INSERT]", insertError);
      return NextResponse.json({ message: "Gagal menyimpan like" }, { status: 500 });
    }

    nextLikes = currentLikes + 1;
    delta = 1;
  }

  const { error: updateError } = await supabase
    .from("home_feed")
    .update({ likes: nextLikes })
    .eq("id", id);

  if (updateError) {
    console.error("[API home/like UPDATE]", updateError);
    return NextResponse.json({ message: "Gagal mengubah likes" }, { status: 500 });
  }

  if (delta === 1) {
    const { data: feedRow } = await supabase
      .from("home_feed")
      .select("created_by, title")
      .eq("id", id)
      .maybeSingle();
    const ownerId = feedRow?.created_by as string | null | undefined;
    if (ownerId && ownerId !== user.id) {
      const liker =
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined) ||
        (user.email as string | undefined) ||
        "Seseorang";
      const t = (feedRow?.title as string | undefined)?.trim() || "postingan Anda";
      await insertEvent(supabase, {
        user_id: ownerId,
        type: "feed_like",
        title: `${liker} menyukai: ${t.length > 70 ? `${t.slice(0, 70)}…` : t}`,
        module: "home_feed",
        link: `/dashboard#post-${id}`,
      });
    }
  }

  return NextResponse.json({ ok: true, likes: nextLikes, delta });
}

