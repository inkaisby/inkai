import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getSessionUser } from "@/app/lib/supabase/session";
import { getUserScope } from "@/app/lib/scope/getUserScope";

export const runtime = "nodejs";

/**
 * GET: Daftar ranting (filter by scope: PP = semua, lain = hanya ranting di scope).
 * Query ?cabang_id=uuid untuk filter per cabang.
 * Query ?province_id=&regency_id=&district_id= untuk filter by wilayah (ranting di kabupaten/kecamatan user).
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const cabangId = searchParams.get("cabang_id");
  const contextRantingId = searchParams.get("context_ranting_id");
  const provinceId = searchParams.get("province_id");
  const regencyId = searchParams.get("regency_id");
  const districtId = searchParams.get("district_id");

  const admin = createSupabaseAdminClient();
  const scope = await getUserScope(admin, user.id);

  let query = admin
    .from("ranting")
    .select("id, nama, aktif, cabang_id, province_id, regency_id, district_id")
    .order("nama");

  if (!scope.is_pp) {
    if (scope.ranting_ids.length === 0) {
      return NextResponse.json([]);
    }
    query = query.in("id", scope.ranting_ids);
  }

  if (contextRantingId && (scope.is_pp || scope.ranting_ids.includes(contextRantingId))) {
    query = query.eq("id", contextRantingId);
  }

  if (cabangId) {
    query = query.eq("cabang_id", cabangId);
  }

  if (provinceId) {
    query = query.eq("province_id", Number(provinceId));
  }
  if (regencyId) {
    query = query.eq("regency_id", Number(regencyId));
  }
  if (districtId) {
    query = query.eq("district_id", Number(districtId));
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
