/**
 * GET /api/keanggotaan/prestasi/pending?ranting_id=xxx
 * Jumlah prestasi yang belum diverifikasi untuk ranting tersebut.
 * Hanya user dengan akses ranting (Ketua Ranting / atasan) yang bisa memanggil.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { checkApiRateLimit } from "@/app/lib/security/apiSecurity";
import { getUserScope } from "@/app/lib/scope/getUserScope";

export async function GET(req: NextRequest) {
  const rateLimitRes = checkApiRateLimit(req, "keanggotaan-riwayat", { max: 60, windowMs: 60_000 });
  if (rateLimitRes) return rateLimitRes;

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const rantingId = req.nextUrl.searchParams.get("ranting_id")?.trim();
  if (!rantingId) return NextResponse.json({ message: "ranting_id wajib" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const scope = await getUserScope(admin, user.id);
  const canAccess = scope.is_pp || (scope.ranting_ids.length > 0 && scope.ranting_ids.includes(rantingId));
  if (!canAccess) return NextResponse.json({ message: "Tidak punya akses ke ranting ini" }, { status: 403 });

  const { data: profiles } = await admin
    .from("profiles")
    .select("id")
    .eq("ranting_id", rantingId);
  const profileIds = (profiles ?? []).map((p: { id: string }) => p.id);
  if (profileIds.length === 0) return NextResponse.json({ count: 0 });

  const { count, error } = await admin
    .from("prestasi")
    .select("id", { count: "exact", head: true })
    .is("verified_at", null)
    .in("profile_id", profileIds);

  if (error) return NextResponse.json({ message: error.message || "Gagal menghitung" }, { status: 500 });

  return NextResponse.json({ count: count ?? 0 });
}
