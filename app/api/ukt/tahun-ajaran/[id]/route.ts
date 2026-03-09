/**
 * PATCH: Edit tahun ajaran UKT (nama, tahun, periode, tanggal, tempat, biaya_per_kyu, ditutup_at, qris_content).
 * Cabang/PP saja; cabang hanya untuk UKT cabang sendiri.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getUserScope } from "@/app/lib/scope/getUserScope";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ message: "id wajib" }, { status: 400 });
  }

  let body: {
    nama?: string;
    tahun?: number;
    periode?: string;
    cabang_id?: string | null;
    tanggal?: string | null;
    tempat?: string | null;
    biaya_per_kyu?: Record<string, number> | null;
    ditutup_at?: string | null;
    qris_content?: string | null;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Body harus JSON" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const scope = await getUserScope(admin, user.id);
  const { data: profile } = await admin.from("profiles").select("app_role").eq("user_id", user.id).maybeSingle();
  const isSuperAdmin = (profile?.app_role as string | null)?.toUpperCase() === "SUPERADMIN";

  const { data: row, error: fetchErr } = await admin
    .from("ukt_tahun_ajaran")
    .select("id, cabang_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !row) {
    return NextResponse.json({ message: "Tahun ajaran tidak ditemukan" }, { status: 404 });
  }

  const tahunCabangId = (row as { cabang_id?: string | null }).cabang_id ?? null;
  const canEdit =
    isSuperAdmin ||
    scope.is_pp ||
    (scope.cabang_ids.length > 0 && (tahunCabangId == null || scope.cabang_ids.includes(tahunCabangId)));
  if (!canEdit) {
    return NextResponse.json({ message: "Hanya PP atau cabang pemilik UKT yang dapat mengubah tahun ajaran" }, { status: 403 });
  }

  const payload: Record<string, unknown> = {};

  if (body.nama !== undefined) {
    const v = typeof body.nama === "string" ? body.nama.trim() : "";
    if (!v) {
      return NextResponse.json({ message: "nama wajib diisi" }, { status: 400 });
    }
    payload.nama = v;
  }
  if (body.tahun !== undefined) {
    const v = typeof body.tahun === "number" ? body.tahun : Number(body.tahun);
    if (!Number.isInteger(v)) {
      return NextResponse.json({ message: "tahun harus berupa angka" }, { status: 400 });
    }
    payload.tahun = v;
  }
  if (body.periode === "I" || body.periode === "II") {
    payload.periode = body.periode;
  }
  if (body.cabang_id !== undefined) {
    payload.cabang_id = body.cabang_id == null || body.cabang_id === "" ? null : String(body.cabang_id).trim();
  }
  if (body.tanggal !== undefined) {
    payload.tanggal = body.tanggal == null || body.tanggal === "" ? null : String(body.tanggal).trim();
  }
  if (body.tempat !== undefined) {
    payload.tempat = body.tempat == null || body.tempat === "" ? null : String(body.tempat).trim();
  }
  if (body.biaya_per_kyu !== undefined) {
    payload.biaya_per_kyu =
      body.biaya_per_kyu != null && typeof body.biaya_per_kyu === "object" && Object.keys(body.biaya_per_kyu).length > 0
        ? body.biaya_per_kyu
        : null;
  }
  if (body.ditutup_at !== undefined) {
    const now = new Date().toISOString();
    payload.ditutup_at = body.ditutup_at === null || body.ditutup_at === "" ? null : (body.ditutup_at ?? now);
  }
  if (body.qris_content !== undefined) {
    payload.qris_content = body.qris_content == null || body.qris_content === "" ? null : String(body.qris_content).trim();
  }

  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ message: "Tidak ada field yang diubah" }, { status: 400 });
  }

  const { data: updated, error } = await admin
    .from("ukt_tahun_ajaran")
    .update(payload)
    .eq("id", id)
    .select("id, nama, tahun, periode, cabang_id, tanggal, tempat, ditutup_at, biaya_per_kyu, qris_content")
    .single();

  if (error) {
    console.error("[ukt/tahun-ajaran PATCH]", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(updated);
}
