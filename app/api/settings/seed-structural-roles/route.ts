export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getSessionUser } from "@/app/lib/supabase/session";
import { requireSuperadmin } from "@/app/lib/security/requireSuperadmin";

const DEFAULT_ROLES: { role_name: string; structural_level: number; organization_type: string }[] = [
  { role_name: "KOHAl", structural_level: 1, organization_type: "KARATE" },
  { role_name: "KETUA_RANTING", structural_level: 2, organization_type: "KARATE" },
  { role_name: "SEKRETARIS_RANTING", structural_level: 2, organization_type: "KARATE" },
  { role_name: "BENDAHARA_RANTING", structural_level: 2, organization_type: "KARATE" },
  { role_name: "KETUA_CABANG", structural_level: 3, organization_type: "KARATE" },
  { role_name: "SEKRETARIS_CABANG", structural_level: 3, organization_type: "KARATE" },
  { role_name: "BENDAHARA_CABANG", structural_level: 3, organization_type: "KARATE" },
  { role_name: "KETUA_PENGPROV", structural_level: 4, organization_type: "KARATE" },
  { role_name: "SEKRETARIS_PENGPROV", structural_level: 4, organization_type: "KARATE" },
  { role_name: "BENDAHARA_PENGPROV", structural_level: 4, organization_type: "KARATE" },
  { role_name: "KESEHATAN_PROV", structural_level: 4, organization_type: "KARATE" },
  { role_name: "KETUA_PP", structural_level: 5, organization_type: "KARATE" },
  { role_name: "SEKRETARIS_PP", structural_level: 5, organization_type: "KARATE" },
  { role_name: "BENDAHARA_PP", structural_level: 5, organization_type: "KARATE" },
];

/**
 * POST: Isi jabatan default hirarki INKAI ke structural_role_master (hanya Superadmin).
 * Idempotent: hanya insert yang belum ada (skip duplicate role_name).
 */
export async function POST() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const gate = await requireSuperadmin(user);
    if (!gate.ok) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const admin = createSupabaseAdminClient();
    let inserted = 0;

    for (const row of DEFAULT_ROLES) {
      const { error } = await admin.from("structural_role_master").insert(row).select("id").single();
      if (error) {
        if (error.code === "23505") continue;
        return NextResponse.json({ message: error.message }, { status: 500 });
      }
      inserted++;
    }

    return NextResponse.json({ ok: true, inserted, total: DEFAULT_ROLES.length });
  } catch (err) {
    console.error("[API seed-structural-roles]", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
