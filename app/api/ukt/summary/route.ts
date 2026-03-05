/**
 * GET: Ringkasan UKT untuk Home Base (total peserta di ranting user, tahun ajaran terbaru).
 */
import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getUserScope } from "@/app/lib/scope/getUserScope";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const scope = await getUserScope(admin, user.id);

  const { data: tahunList } = await admin
    .from("ukt_tahun_ajaran")
    .select("id, nama, tahun, periode")
    .eq("is_active", true)
    .order("tahun", { ascending: false })
    .order("periode", { ascending: false })
    .limit(1);

  const tahun = Array.isArray(tahunList) && tahunList.length > 0 ? tahunList[0] : null;
  if (!tahun) {
    return NextResponse.json({
      tahun_ajaran: null,
      total_peserta: 0,
    });
  }

  let total = 0;
  if (scope.is_pp) {
    const { count, error } = await admin
      .from("ukt_pendaftaran")
      .select("id", { count: "exact", head: true })
      .eq("tahun_ajaran_id", tahun.id)
      .neq("status_bayar", "batal");
    if (!error && count != null) total = count;
  } else if (scope.ranting_ids.length > 0) {
    const { count, error } = await admin
      .from("ukt_pendaftaran")
      .select("id", { count: "exact", head: true })
      .eq("tahun_ajaran_id", tahun.id)
      .in("ranting_id", scope.ranting_ids)
      .neq("status_bayar", "batal");
    if (!error && count != null) total = count;
  }

  return NextResponse.json({
    tahun_ajaran: { id: tahun.id, nama: tahun.nama },
    total_peserta: total,
  });
}
