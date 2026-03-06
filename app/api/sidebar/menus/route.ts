export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getUserScope } from "@/app/lib/scope/getUserScope";
import { isProfileCompleted } from "@/app/lib/profileCompleted";

const PROFILE_FIELDS =
  "email_allowed, app_role, nik, nama, email, telepon, jenis_kelamin, tanggal_lahir, nama_ayah, nama_ibu, pekerjaan_ortu, alamat, province_id, regency_id, district_id, village_id, ranting_id, avatar_path, structural_level";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select(PROFILE_FIELDS)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: structural } = await admin.rpc("get_user_structural_roles", {
    p_user_id: user.id,
  });

  const { data: functionalRows } = await admin
    .from("user_functional_roles")
    .select("role, active, context_id")
    .eq("user_id", user.id)
    .eq("active", true);

  const functional_roles = (functionalRows ?? []).map(
    (r: { role: string; active: boolean; context_id?: string | null }) => ({
      role_name: r.role,
      active: r.active,
      context_id: r.context_id ?? null,
    }),
  );

  const scope = await getUserScope(admin, user.id);

  // Sidebar: daftar 100% dari DB (tabel menus, scope = sidebar). Sama dengan MenuList di Pengaturan.
  const { data: menus } = await admin
    .from("menus")
    .select(
      "id, key, name, icon, color, order_index, is_active, scope, superadmin_only, required_structural_level, required_functional_role, context_required",
    )
    .eq("scope", "sidebar")
    .order("order_index");

  const profile_completed = isProfileCompleted(profile as Record<string, unknown> | null);

  const profileRegencyId =
    profile?.regency_id != null
      ? String(profile.regency_id).replace(/\./g, "").trim()
      : null;

  return NextResponse.json({
    user: {
      email: user.email ?? null,
      nama: profile?.nama ?? null,
      email_allowed: profile?.email_allowed ?? false,
      app_role: profile?.app_role ?? null,
      structural_roles: structural ?? [],
      profile_structural_level: profile?.structural_level ?? null,
      profile_regency_id: profileRegencyId,
      functional_roles,
      scope,
    },
    profile_completed,
    menus: menus ?? [],
  });
}

