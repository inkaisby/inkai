import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getSessionUser } from "@/app/lib/supabase/session";
import { getUserScope } from "@/app/lib/scope/getUserScope";

export const runtime = "nodejs";

/** GET: Daftar provinsi organisasi INKAI (filter by scope: PP/Superadmin = semua, lain = hanya provinsi di scope) */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const scope = await getUserScope(admin, user.id);
  const { data: profile } = await admin
    .from("profiles")
    .select("app_role")
    .eq("user_id", user.id)
    .maybeSingle();
  const isSuperadmin = (profile?.app_role as string | null)?.toUpperCase() === "SUPERADMIN";
  const canSeeAllProvinsi = scope.is_pp || isSuperadmin;

  if (!canSeeAllProvinsi && scope.provinsi_ids.length === 0) {
    return NextResponse.json([]);
  }

  let query = admin
    .from("provinsi")
    .select("id, nama, aktif")
    .order("nama");

  if (!canSeeAllProvinsi) {
    query = query.in("id", scope.provinsi_ids);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { message: error.message, code: error.code },
      { status: 500 }
    );
  }

  return NextResponse.json(data ?? []);
}
