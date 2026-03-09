/**
 * POST /api/ukt/kwitansi-ranting/ensure
 * Pastikan kwitansi ranting ada (create jika belum). Return token untuk QR.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getUserScope } from "@/app/lib/scope/getUserScope";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: { tahun_ajaran_id?: string; ranting_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { message: "Body harus JSON valid" },
      { status: 400 }
    );
  }

  const tahunAjaranId = body.tahun_ajaran_id?.trim();
  const rantingId = body.ranting_id?.trim();

  if (!tahunAjaranId || !rantingId) {
    return NextResponse.json(
      { message: "tahun_ajaran_id dan ranting_id wajib" },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdminClient();
  const scope = await getUserScope(admin, user.id);
  const { data: profile } = await admin
    .from("profiles")
    .select("app_role")
    .eq("user_id", user.id)
    .maybeSingle();
  const isSuperAdmin =
    (profile?.app_role as string | null)?.toUpperCase() === "SUPERADMIN";
  const canAccess =
    isSuperAdmin ||
    scope.is_pp ||
    (scope.ranting_ids.length > 0 && scope.ranting_ids.includes(rantingId));

  if (!canAccess) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { data: existing } = await admin
    .from("ukt_kwitansi_ranting")
    .select("id, token, no_kwitansi")
    .eq("tahun_ajaran_id", tahunAjaranId)
    .eq("ranting_id", rantingId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      token: existing.token,
      no_kwitansi:
        existing.no_kwitansi ??
        `UKT-R-${String(existing.id).slice(0, 8).toUpperCase()}`,
    });
  }

  const noKwitansi = `UKT-R-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const { data: inserted, error } = await admin
    .from("ukt_kwitansi_ranting")
    .insert({
      tahun_ajaran_id: tahunAjaranId,
      ranting_id: rantingId,
      no_kwitansi: noKwitansi,
    })
    .select("token, no_kwitansi")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: retry } = await admin
        .from("ukt_kwitansi_ranting")
        .select("token, no_kwitansi")
        .eq("tahun_ajaran_id", tahunAjaranId)
        .eq("ranting_id", rantingId)
        .maybeSingle();
      if (retry)
        return NextResponse.json({
          token: retry.token,
          no_kwitansi: retry.no_kwitansi,
        });
    }
    console.error("[ukt/kwitansi-ranting/ensure]", error);
    return NextResponse.json(
      { message: error.message || "Gagal membuat kwitansi ranting" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    token: inserted.token,
    no_kwitansi: inserted.no_kwitansi ?? noKwitansi,
  });
}
