export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { isValidUuid } from "@/app/lib/security/validateUuid";

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ message: "id tidak valid" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("home_feed_comments").delete().eq("id", id);

  if (error) {
    console.error("[API home/comments DELETE]", error);
    return NextResponse.json({ message: "Gagal menghapus komentar" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

