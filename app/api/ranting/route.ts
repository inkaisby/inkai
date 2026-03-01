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

  const { data: profile } = await admin
    .from("profiles")
    .select("app_role")
    .eq("user_id", user.id)
    .maybeSingle();
  const isSuperAdmin =
    (profile?.app_role as string | null)?.toUpperCase() === "SUPERADMIN";
  const canSeeAllRanting = scope.is_pp || isSuperAdmin;

  let query = admin
    .from("ranting")
    .select("id, nama, aktif, cabang_id, province_id, regency_id, district_id, instagram_url")
    .order("nama");

  const hasWilayahFilter = Boolean(provinceId || regencyId || districtId);

  // Untuk profil self-service: jika filter wilayah, skip scope agar user bisa pilih ranting di area alamat.
  const skipScopeForWilayah = hasWilayahFilter;

  if (!canSeeAllRanting && !skipScopeForWilayah) {
    if (scope.ranting_ids.length === 0) {
      if (!hasWilayahFilter) {
        // Tanpa filter wilayah dan tanpa scope: kembalikan hanya context_ranting milik user (untuk tampilan nama)
        if (contextRantingId) {
          const { data: one } = await admin
            .from("ranting")
            .select("id, nama, aktif, cabang_id, province_id, regency_id, district_id, instagram_url")
            .eq("id", contextRantingId)
            .maybeSingle();
          const { data: usr } = await admin
            .from("user_structural_roles")
            .select("ranting_id")
            .eq("user_id", user.id)
            .eq("ranting_id", contextRantingId)
            .limit(1)
            .maybeSingle();
          const { data: prof } = await admin
            .from("profiles")
            .select("ranting_id")
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle();
          const isSelf = !!(usr?.ranting_id || prof?.ranting_id === contextRantingId);
          if (isSelf && one) return NextResponse.json([one]);
        }
        return NextResponse.json([]);
      }
    } else {
      query = query.in("id", scope.ranting_ids);
    }
  }

  // Jangan batasi ke satu ranting untuk PP/Superadmin agar dropdown bisa tampil semua ranting
  if (
    contextRantingId &&
    !canSeeAllRanting &&
    scope.ranting_ids.includes(contextRantingId)
  ) {
    query = query.eq("id", contextRantingId);
  }

  if (cabangId) {
    query = query.eq("cabang_id", cabangId);
  }

  // Filter by wilayah: provinsi wajib; kabupaten/kecamatan fleksibel (ranting dengan null tetap ikut)
  if (provinceId) {
    query = query.eq("province_id", Number(provinceId));
  }
  if (regencyId) {
    query = query.or(
      `regency_id.eq.${regencyId},regency_id.is.null`
    );
  }
  if (districtId) {
    const districtNum = parseInt(districtId, 10);
    const district6 =
      districtId.length > 6 ? parseInt(districtId.slice(0, 6), 10) : null;
    if (
      !Number.isNaN(districtNum) &&
      district6 != null &&
      !Number.isNaN(district6) &&
      district6 !== districtNum
    ) {
      query = query.or(
        `district_id.eq.${districtNum},district_id.eq.${district6},district_id.is.null`
      );
    } else if (!Number.isNaN(districtNum)) {
      query = query.or(
        `district_id.eq.${districtNum},district_id.is.null`
      );
    }
  }

  let { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { message: error.message, code: error.code },
      { status: 500 }
    );
  }

  // Agar nama ranting user tetap tampil (bukan "Tidak ditemukan") saat ranting tidak ada di filter wilayah
  if (contextRantingId && data) {
    const hasInResult = data.some((r) => r.id === contextRantingId);
    if (!hasInResult) {
      let isSelfRanting = false;
      const { data: selfRole } = await admin
        .from("user_structural_roles")
        .select("ranting_id")
        .eq("user_id", user.id)
        .eq("ranting_id", contextRantingId)
        .limit(1)
        .maybeSingle();
      if (selfRole?.ranting_id) isSelfRanting = true;
      // Sumber ranting_id bisa dari profiles (get_profile_self)
      if (!isSelfRanting) {
        const { data: prof } = await admin
          .from("profiles")
          .select("ranting_id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();
        if (prof?.ranting_id === contextRantingId) isSelfRanting = true;
      }
      if (isSelfRanting) {
        const { data: one } = await admin
          .from("ranting")
          .select("id, nama, aktif, cabang_id, province_id, regency_id, district_id, instagram_url")
          .eq("id", contextRantingId)
          .maybeSingle();
        if (one) data = [...data, one];
      }
    }
  }

  return NextResponse.json(data ?? []);
}
