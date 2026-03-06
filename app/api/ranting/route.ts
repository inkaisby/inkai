import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getSessionUser } from "@/app/lib/supabase/session";
import { getUserScope } from "@/app/lib/scope/getUserScope";
import { getFeatureConfig } from "@/app/lib/featureConfig";

export const runtime = "nodejs";

const ROOT_EMAIL =
  (process.env.NEXT_PUBLIC_INKAI_ROOT_EMAIL as string | undefined)?.toLowerCase() ??
  null;

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
  const email = (user.email ?? "").toLowerCase();
  const isRoot = ROOT_EMAIL && email && email === ROOT_EMAIL;
  const isSuperAdmin =
    isRoot || (profile?.app_role as string | null)?.toUpperCase() === "SUPERADMIN";
  const canSeeAllRanting = scope.is_pp || isSuperAdmin;

  let query = admin
    .from("ranting")
    .select("id, nama, aktif, cabang_id, province_id, regency_id, district_id, instagram_url")
    .order("nama");

  // Selalu terapkan scope untuk non-PP/Superadmin — filter wilayah hanya mempersempit hasil dalam scope (cegah bocor data).
  // Pengecualian: user tanpa scope yang melengkapi profil — jika kirim province_id, tampilkan ranting di wilayah tersebut.
  const isProfileCompletionFlow =
    !canSeeAllRanting &&
    scope.ranting_ids.length === 0 &&
    Boolean(provinceId);

  if (!canSeeAllRanting && !isProfileCompletionFlow) {
    if (scope.ranting_ids.length === 0) {
      // Tanpa scope: hanya kembalikan context_ranting milik user (untuk tampilan nama), atau kosong
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
    query = query.in("id", scope.ranting_ids);
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

/**
 * POST: Tambah ranting baru (isi manual oleh Cabang/PP).
 * Hanya user dengan scope cabang (Ketua Cabang, Pengprov, PP) yang boleh menambah.
 * cabang_id wajib dan harus dalam scope user.
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: {
    nama?: string;
    cabang_id?: string;
    province_id?: number | null;
    regency_id?: number | null;
    district_id?: number | null;
    instagram_url?: string | null;
    aktif?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { message: "Body harus JSON valid" },
      { status: 400 }
    );
  }

  const nama = typeof body.nama === "string" ? body.nama.trim() : "";
  const cabangId =
    typeof body.cabang_id === "string" && body.cabang_id.trim()
      ? body.cabang_id.trim()
      : null;

  if (!nama) {
    return NextResponse.json(
      { message: "Nama ranting wajib diisi" },
      { status: 400 },
    );
  }

  const admin = createSupabaseAdminClient();
  const scope = await getUserScope(admin, user.id);

  const { data: profile } = await admin
    .from("profiles")
    .select("app_role, structural_level")
    .eq("user_id", user.id)
    .maybeSingle();
  const email = (user.email ?? "").toLowerCase();
  const isRoot = ROOT_EMAIL && email && email === ROOT_EMAIL;
  const isSuperAdmin =
    isRoot || (profile?.app_role as string | null)?.toUpperCase() === "SUPERADMIN";

  // POST ranting: level minimal dari app_feature_config (default 3)
  if (!isSuperAdmin) {
    const config = await getFeatureConfig();
    const minLevel = config.homebase_min_level_create_ranting;
    const { data: structural } = await admin.rpc("get_user_structural_roles", {
      p_user_id: user.id,
    });
    const levels = (structural ?? [])
      .filter((r: { active: boolean }) => r.active)
      .map((r: { structural_level: number }) => r.structural_level);
    const profileLevel = profile?.structural_level ?? 0;
    const maxLevel = Math.max(0, ...levels, profileLevel);
    if (maxLevel < minLevel) {
      return NextResponse.json(
        { message: `Hanya level ${minLevel}+ yang dapat menambah ranting` },
        { status: 403 },
      );
    }
  }

  const canManageAll = scope.is_pp || isSuperAdmin;

  if (!canManageAll) {
    if (scope.cabang_ids.length === 0) {
      return NextResponse.json(
        { message: "Hanya Cabang/Pengprov/PP yang dapat menambah ranting" },
        { status: 403 },
      );
    }
    if (!cabangId || !scope.cabang_ids.includes(cabangId)) {
      return NextResponse.json(
        {
          message:
            "Ranting hanya dapat ditambah di bawah cabang yang Anda kelola",
        },
        { status: 403 },
      );
    }
  }

  const insert: Record<string, unknown> = {
    nama,
    aktif: body.aktif !== false,
  };
  if (cabangId) insert.cabang_id = cabangId;
  if (body.province_id != null) insert.province_id = body.province_id;
  if (body.regency_id != null) insert.regency_id = body.regency_id;
  if (body.district_id != null) insert.district_id = body.district_id;
  if (body.instagram_url !== undefined) insert.instagram_url = body.instagram_url || null;

  const { data: created, error } = await admin
    .from("ranting")
    .insert(insert)
    .select("id, nama, aktif, cabang_id, province_id, regency_id, district_id, instagram_url")
    .single();

  if (error) {
    return NextResponse.json(
      { message: error.message, code: error.code },
      { status: 500 }
    );
  }

  return NextResponse.json(created);
}

/**
 * PATCH: Update ranting (nama, cabang, aktif, instagram, wilayah).
 * Hanya Cabang/Pengprov/PP (atau SUPERADMIN) dan hanya untuk ranting dalam scope.
 */
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: {
    id?: string;
    nama?: string;
    cabang_id?: string | null;
    province_id?: number | null;
    regency_id?: number | null;
    district_id?: number | null;
    instagram_url?: string | null;
    aktif?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { message: "Body harus JSON valid" },
      { status: 400 },
    );
  }

  const id = typeof body.id === "string" ? body.id : null;
  if (!id) {
    return NextResponse.json(
      { message: "ID ranting wajib diisi" },
      { status: 400 },
    );
  }

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
  const canManageAll = scope.is_pp || isSuperAdmin;

  if (!canManageAll && scope.ranting_ids.length === 0) {
    return NextResponse.json(
      { message: "Tidak punya akses untuk mengubah ranting" },
      { status: 403 },
    );
  }
  if (!canManageAll && !scope.ranting_ids.includes(id)) {
    return NextResponse.json(
      { message: "Ranting di luar scope Anda" },
      { status: 403 },
    );
  }

  const update: Record<string, unknown> = {};
  if (typeof body.nama === "string") update.nama = body.nama.trim();
  if (body.cabang_id !== undefined) update.cabang_id = body.cabang_id;
  if (body.province_id !== undefined) update.province_id = body.province_id;
  if (body.regency_id !== undefined) update.regency_id = body.regency_id;
  if (body.district_id !== undefined) update.district_id = body.district_id;
  if (body.instagram_url !== undefined)
    update.instagram_url = body.instagram_url || null;
  if (body.aktif !== undefined) update.aktif = body.aktif;

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { message: "Tidak ada field yang diubah" },
      { status: 400 },
    );
  }

  const { data, error } = await admin
    .from("ranting")
    .update(update)
    .eq("id", id)
    .select(
      "id, nama, aktif, cabang_id, province_id, regency_id, district_id, instagram_url",
    )
    .single();

  if (error) {
    return NextResponse.json(
      { message: error.message, code: error.code },
      { status: 500 },
    );
  }

  return NextResponse.json(data);
}

/**
 * DELETE: Hapus ranting (soft: baris dihapus, data lain tetap RLS).
 * Akses sama dengan PATCH.
 */
export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { message: "ID ranting wajib diisi" },
      { status: 400 },
    );
  }

  const admin = createSupabaseAdminClient();
  const scope = await getUserScope(admin, user.id);

  const { data: profile } = await admin
    .from("profiles")
    .select("app_role, structural_level")
    .eq("user_id", user.id)
    .maybeSingle();
  const email = (user.email ?? "").toLowerCase();
  const isRoot = ROOT_EMAIL && email && email === ROOT_EMAIL;
  const isSuperAdmin =
    isRoot || (profile?.app_role as string | null)?.toUpperCase() === "SUPERADMIN";

  // DELETE ranting: level minimal dari app_feature_config (default 3)
  if (!isSuperAdmin) {
    const config = await getFeatureConfig();
    const minLevel = config.homebase_min_level_delete_ranting;
    const { data: structural } = await admin.rpc("get_user_structural_roles", {
      p_user_id: user.id,
    });
    const levels = (structural ?? [])
      .filter((r: { active: boolean }) => r.active)
      .map((r: { structural_level: number }) => r.structural_level);
    const profileLevel = profile?.structural_level ?? 0;
    const maxLevel = Math.max(0, ...levels, profileLevel);
    if (maxLevel < minLevel) {
      return NextResponse.json(
        { message: `Hanya level ${minLevel}+ yang dapat menghapus ranting` },
        { status: 403 },
      );
    }
  }

  const canManageAll = scope.is_pp || isSuperAdmin;

  if (!canManageAll && scope.ranting_ids.length === 0) {
    return NextResponse.json(
      { message: "Tidak punya akses untuk menghapus ranting" },
      { status: 403 },
    );
  }
  if (!canManageAll && !scope.ranting_ids.includes(id)) {
    return NextResponse.json(
      { message: "Ranting di luar scope Anda" },
      { status: 403 },
    );
  }

  const { error } = await admin.from("ranting").delete().eq("id", id);
  if (error) {
    return NextResponse.json(
      { message: error.message, code: error.code },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
