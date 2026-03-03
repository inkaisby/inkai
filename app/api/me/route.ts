export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { checkApiRateLimit } from "@/app/lib/security/apiSecurity";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getUserScope } from "@/app/lib/scope/getUserScope";
import { isProfileCompleted } from "@/app/lib/profileCompleted";

export async function GET(req: NextRequest) {
  const rateLimitRes = checkApiRateLimit(req, "api-me", { max: 60, windowMs: 60_000 });
  if (rateLimitRes) return rateLimitRes;

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();

  let { data: profileRow } = await admin
    .from("profiles")
    .select(
      "id, user_id, nama, email, email_allowed, app_role, nik, telepon, jenis_kelamin, tanggal_lahir, nama_ayah, nama_ibu, pekerjaan_ortu, alamat, province_id, regency_id, district_id, village_id, ranting_id, avatar_path"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  // Fallback: jika trigger signup gagal, buat profil saat pertama kali /api/me
  if (!profileRow) {
    const { data: inserted } = await admin
      .from("profiles")
      .insert({
        id: crypto.randomUUID(),
        user_id: user.id,
        email: user.email ?? "",
        nama: user.email ?? "",
        app_role: "USER",
        email_allowed: true,
      })
      .select("id, user_id, nama, email, email_allowed, app_role, nik, telepon, jenis_kelamin, tanggal_lahir, nama_ayah, nama_ibu, pekerjaan_ortu, alamat, province_id, regency_id, district_id, village_id, ranting_id, avatar_path")
      .single();
    if (inserted) profileRow = inserted;
  }

  const { data: structural } = await admin.rpc("get_user_structural_roles", {
    p_user_id: user.id,
  });

  const scope = await getUserScope(admin, user.id);

  const profile = profileRow
    ? {
        id: profileRow.id,
        user_id: profileRow.user_id,
        nama: profileRow.nama,
        email_allowed: profileRow.email_allowed,
        app_role: profileRow.app_role,
        profile_completed: isProfileCompleted(profileRow as Record<string, unknown>),
      }
    : null;

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email ?? null,
    },
    profile,
    structural_roles: structural ?? [],
    functional_roles: [],
    scope,
  });
}

