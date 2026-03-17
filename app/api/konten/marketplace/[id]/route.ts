export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { isValidUuid } from "@/app/lib/security/validateUuid";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  if (!isValidUuid(id)) return NextResponse.json({ message: "id tidak valid" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const payload: Record<string, unknown> = {};

  if (typeof body?.title === "string") payload.title = body.title.trim();
  if (typeof body?.price === "string") payload.price = body.price.trim();
  if (typeof body?.href === "string") payload.href = body.href.trim() || "/dashboard";
  if (typeof body?.image_path === "string") payload.image_path = body.image_path.trim() || null;
  if (typeof body?.is_active === "boolean") payload.is_active = body.is_active;
  if (typeof body?.order_index === "number" && Number.isFinite(body.order_index)) {
    payload.order_index = Math.trunc(body.order_index);
  }

  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ message: "Tidak ada perubahan" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("home_marketplace").update(payload).eq("id", id);

  if (error) {
    console.error("[API konten/marketplace PATCH]", error);
    return NextResponse.json({ message: "Gagal update" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  if (!isValidUuid(id)) return NextResponse.json({ message: "id tidak valid" }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("home_marketplace").delete().eq("id", id);

  if (error) {
    console.error("[API konten/marketplace DELETE]", error);
    return NextResponse.json({ message: "Gagal hapus" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

