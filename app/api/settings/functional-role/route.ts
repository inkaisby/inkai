export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getSessionUser } from "@/app/lib/supabase/session";
import { requireSuperadmin } from "@/app/lib/security/requireSuperadmin";
import { isValidUuid } from "@/app/lib/security/validateUuid";

/**
 * PATCH: Toggle active status of a functional role row.
 * Body: { id: string, active: boolean }
 */
export async function PATCH(req: NextRequest) {
  try {
    const me = await getSessionUser();
    if (!me) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const gate = await requireSuperadmin(me);
    if (!gate.ok) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const id = typeof body?.id === "string" ? body.id.trim() : "";
    const active = body?.active === true;
    if (!id || !isValidUuid(id)) {
      return NextResponse.json({ message: "id tidak valid" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("user_functional_roles").update({ active }).eq("id", id);
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[API functional-role PATCH]", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE: Hapus role fungsional dari user.
 * Query: ?id=uuid
 */
export async function DELETE(req: NextRequest) {
  try {
    const me = await getSessionUser();
    if (!me) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const gate = await requireSuperadmin(me);
    if (!gate.ok) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const id = req.nextUrl.searchParams.get("id")?.trim() ?? "";
    if (!id || !isValidUuid(id)) {
      return NextResponse.json({ message: "id tidak valid" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("user_functional_roles").delete().eq("id", id);
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[API functional-role DELETE]", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

