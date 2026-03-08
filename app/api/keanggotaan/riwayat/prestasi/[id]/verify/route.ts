/**
 * POST /api/keanggotaan/riwayat/prestasi/[id]/verify
 * Verifikasi prestasi oleh Ketua Ranting (atau PP/Cabang/Pengprov yang punya akses ranting).
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { checkApiRateLimit } from "@/app/lib/security/apiSecurity";
import { getUserScope } from "@/app/lib/scope/getUserScope";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitRes = checkApiRateLimit(_req, "keanggotaan-riwayat", { max: 30, windowMs: 60_000 });
  if (rateLimitRes) return rateLimitRes;

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const admin = createSupabaseAdminClient();

  const { data: prestasi, error: prestasiError } = await admin
    .from("prestasi")
    .select("id, profile_id")
    .eq("id", id)
    .maybeSingle();

  if (prestasiError || !prestasi) {
    return NextResponse.json({ message: "Prestasi tidak ditemukan" }, { status: 404 });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("ranting_id")
    .eq("id", prestasi.profile_id)
    .maybeSingle();

  const rantingId = profile?.ranting_id ? String(profile.ranting_id).trim() : null;
  if (!rantingId) {
    return NextResponse.json({ message: "Profil anggota belum memiliki ranting" }, { status: 400 });
  }

  const scope = await getUserScope(admin, user.id);
  const canVerify = scope.is_pp || (scope.ranting_ids.length > 0 && scope.ranting_ids.includes(rantingId));
  if (!canVerify) {
    return NextResponse.json({ message: "Hanya Ketua Ranting (atau atasan) yang dapat memverifikasi prestasi" }, { status: 403 });
  }

  const { data: row, error } = await admin
    .from("prestasi")
    .update({ verified_at: new Date().toISOString(), verified_by: user.id })
    .eq("id", id)
    .select("id, verified_at, verified_by")
    .single();

  if (error) return NextResponse.json({ message: error.message || "Gagal memverifikasi" }, { status: 500 });

  return NextResponse.json({
    ok: true,
    id: String(row.id),
    verifiedAt: row.verified_at ?? undefined,
    verifiedBy: row.verified_by ?? undefined,
  });
}
