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
      "id, user_id, nama, email, email_allowed, app_role, nik, telepon, telepon_verified_at, telepon_verified_e164, jenis_kelamin, tanggal_lahir, nama_ayah, nama_ibu, pekerjaan_ortu, alamat, province_id, regency_id, district_id, village_id, ranting_id, avatar_path, ktp_path, akta_lahir_path, kk_path"
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
      .select("id, user_id, nama, email, email_allowed, app_role, nik, telepon, telepon_verified_at, telepon_verified_e164, jenis_kelamin, tanggal_lahir, nama_ayah, nama_ibu, pekerjaan_ortu, alamat, province_id, regency_id, district_id, village_id, ranting_id, avatar_path, ktp_path, akta_lahir_path, kk_path")
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
        province_id: profileRow.province_id ?? null,
        regency_id: profileRow.regency_id ?? null,
        district_id: profileRow.district_id ?? null,
        village_id: profileRow.village_id ?? null,
        ranting_id: profileRow.ranting_id ?? null,
        ktp_path: (profileRow as { ktp_path?: string | null }).ktp_path ?? null,
        akta_lahir_path: (profileRow as { akta_lahir_path?: string | null }).akta_lahir_path ?? null,
        kk_path: (profileRow as { kk_path?: string | null }).kk_path ?? null,
        telepon_verified_at:
          (profileRow as { telepon_verified_at?: string | null }).telepon_verified_at ??
          null,
        telepon_verified_e164:
          (profileRow as { telepon_verified_e164?: string | null }).telepon_verified_e164 ??
          null,
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

