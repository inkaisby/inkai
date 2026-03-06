export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getSessionUser } from "@/app/lib/supabase/session";
import { requireSuperadmin } from "@/app/lib/security/requireSuperadmin";
import { isValidUuid } from "@/app/lib/security/validateUuid";

const ALLOWED_ROLES = [
  "SEKRETARIS",
  "BENDAHARA",
  "PELATIH",
  "PENGUJI",
  "WASIT",
  "ADM_PERTANDINGAN",
] as const;

/**
 * POST: Tambah role fungsional ke user (hanya Superadmin).
 * Body: { user_id: string, role: string }
 * Role: SEKRETARIS | BENDAHARA | PELATIH | PENGUJI | WASIT | ADM_PERTANDINGAN
 */
export async function POST(req: NextRequest) {
  try {
    const me = await getSessionUser();
    if (!me) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const gate = await requireSuperadmin(me);
    if (!gate.ok) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const userId = typeof body?.user_id === "string" ? body.user_id.trim() : "";
    const role = typeof body?.role === "string"
      ? body.role.trim().toUpperCase().replace(/\s+/g, "_")
      : "";

    if (!userId || !isValidUuid(userId)) {
      return NextResponse.json(
        { message: "user_id tidak valid" },
        { status: 400 }
      );
    }
    if (!role) {
      return NextResponse.json(
        { message: "role wajib diisi" },
        { status: 400 }
      );
    }
    if (!ALLOWED_ROLES.includes(role as (typeof ALLOWED_ROLES)[number])) {
      return NextResponse.json(
        { message: `Role harus salah satu: ${ALLOWED_ROLES.join(", ")}` },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();

    // Cek apakah user ada (profiles atau auth)
    const { data: profile } = await admin
      .from("profiles")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!profile) {
      const { data: authUser } = await admin.auth.admin.getUserById(userId);
      if (!authUser?.user) {
        return NextResponse.json(
          { message: "User tidak ditemukan" },
          { status: 404 }
        );
      }
    }

    // Upsert: insert atau update active=true jika sudah ada
    const { data: existing } = await admin
      .from("user_functional_roles")
      .select("id, active")
      .eq("user_id", userId)
      .eq("role", role)
      .is("context_id", null)
      .maybeSingle();

    if (existing) {
      if (existing.active) {
        return NextResponse.json({ ok: true, message: "Role sudah aktif" });
      }
      const { error } = await admin
        .from("user_functional_roles")
        .update({ active: true })
        .eq("id", existing.id);
      if (error) {
        return NextResponse.json(
          { message: error.message },
          { status: 500 }
        );
      }
    } else {
      const { error } = await admin.from("user_functional_roles").insert({
        user_id: userId,
        role,
        active: true,
        context_id: null,
      });
      if (error) {
        return NextResponse.json(
          { message: error.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[API add-functional-role]", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
