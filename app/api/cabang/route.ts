import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getSessionUser } from "@/app/lib/supabase/session";
import { getUserScope } from "@/app/lib/scope/getUserScope";

export const runtime = "nodejs";

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

  let query = admin
    .from("cabang")
    .select("id, nama, provinsi_id, aktif")
    .order("nama");

  if (!scope.is_pp) {
    if (scope.cabang_ids.length === 0) {
      return NextResponse.json([]);
    }
    query = query.in("id", scope.cabang_ids);
  }

  if (contextCabangId && (scope.is_pp || scope.cabang_ids.includes(contextCabangId))) {
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
