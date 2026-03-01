export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getSessionUser } from "@/app/lib/supabase/session";
import { requireSuperadmin } from "@/app/lib/security/requireSuperadmin";

/**
 * POST: Pastikan jabatan ada di structural_role_master (insert jika belum).
 * Body: { role_name: string, structural_level: number (1-5) }
 * Hanya Superadmin. Return { id }.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const gate = await requireSuperadmin(user);
    if (!gate.ok) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const roleName = typeof body?.role_name === "string" ? body.role_name.trim().toUpperCase().replace(/\s+/g, "_") : "";
    const level = typeof body?.structural_level === "number" ? body.structural_level : Number(body?.structural_level);
    if (!roleName || level < 1 || level > 5) {
      return NextResponse.json(
        { message: "role_name dan structural_level (1-5) wajib" },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();
    const { data: existing } = await admin
      .from("structural_role_master")
      .select("id")
      .eq("role_name", roleName)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ id: existing.id });
    }

    const { data: inserted, error } = await admin
      .from("structural_role_master")
      .insert({
        role_name: roleName,
        structural_level: level,
        organization_type: "KARATE",
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }
    return NextResponse.json({ id: inserted.id });
  } catch (err) {
    console.error("[API ensure-structural-role]", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
