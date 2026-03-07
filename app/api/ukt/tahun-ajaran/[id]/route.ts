/**
 * PATCH: Tutup/buka tahun ajaran UKT (set ditutup_at). Cabang/PP saja; cabang hanya untuk UKT cabang sendiri.
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

  let body: { ditutup_at?: string | null; qris_content?: string | null } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Body harus JSON" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const scope = await getUserScope(admin, user.id);

  const { data: row, error: fetchErr } = await admin
    .from("ukt_tahun_ajaran")
    .select("id, cabang_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !row) {
    return NextResponse.json({ message: "Tahun ajaran tidak ditemukan" }, { status: 404 });
  }

  const tahunCabangId = (row as { cabang_id?: string | null }).cabang_id ?? null;
  const canEdit = scope.is_pp || (scope.cabang_ids.length > 0 && (tahunCabangId == null || scope.cabang_ids.includes(tahunCabangId)));
  if (!canEdit) {
    return NextResponse.json({ message: "Hanya PP atau cabang pemilik UKT yang dapat mengubah tahun ajaran" }, { status: 403 });
  }

  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {};
  if (body.ditutup_at !== undefined) {
    payload.ditutup_at = body.ditutup_at === null || body.ditutup_at === "" ? null : (body.ditutup_at ?? now);
  }
  if (body.qris_content !== undefined) {
    payload.qris_content = body.qris_content == null || body.qris_content === "" ? null : String(body.qris_content).trim();
  }
  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ message: "Berikan ditutup_at dan/atau qris_content" }, { status: 400 });
  }

  const { data: updated, error } = await admin
    .from("ukt_tahun_ajaran")
    .update(payload)
    .eq("id", id)
    .select("id, nama, ditutup_at, qris_content")
    .single();

  if (error) {
    console.error("[ukt/tahun-ajaran PATCH]", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(updated);
}
