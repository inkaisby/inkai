import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getSessionUser } from "@/app/lib/supabase/session";
import { getUserScope } from "@/app/lib/scope/getUserScope";

export const runtime = "nodejs";

const ROOT_EMAIL =
  (process.env.NEXT_PUBLIC_INKAI_ROOT_EMAIL as string | undefined)?.toLowerCase() ??
  null;

/** GET: Daftar cabang (filter by scope). Query ?provinsi_id=uuid untuk filter per provinsi. */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const provinsiId = searchParams.get("provinsi_id");
  const contextCabangId = searchParams.get("context_cabang_id");

  const admin = createSupabaseAdminClient();
  const scope = await getUserScope(admin, user.id);

  const { data: profile } = await admin
    .from("profiles")
    .select("app_role")
    .eq("user_id", user.id)
    .maybeSingle();
  const email = (user.email ?? "").toLowerCase();
  const isRoot = ROOT_EMAIL && email && email === ROOT_EMAIL;
  const isSuperAdmin =
    isRoot || (profile?.app_role as string | null)?.toUpperCase() === "SUPERADMIN";
  const canSeeAllCabang = scope.is_pp || isSuperAdmin;

  // Debug: jejak siapa yang memanggil dan scope-nya
  // (Akan tampil di server log saat dev)
   
  console.log("[API /cabang] caller", {
    email,
    app_role: profile?.app_role ?? null,
    isRoot,
    isSuperAdmin,
    is_pp: scope.is_pp,
    cabang_ids: scope.cabang_ids,
    provinsiId,
  });

  let query = admin
    .from("cabang")
    .select("id, nama, provinsi_id, aktif")
    .order("nama");

  if (!canSeeAllCabang) {
    if (scope.cabang_ids.length === 0) {
      return NextResponse.json([]);
    }
    query = query.in("id", scope.cabang_ids);
  }

  if (
    contextCabangId &&
    (canSeeAllCabang || scope.cabang_ids.includes(contextCabangId))
  ) {
    query = query.eq("id", contextCabangId);
  }

  if (provinsiId) {
    query = query.eq("provinsi_id", provinsiId);
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
