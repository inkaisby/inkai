/**
 * GET: Ringkasan UKT untuk Home Base (total peserta di ranting user, tahun ajaran terbaru).
 * Query ?ranting_ids=uuid1,uuid2 untuk filter per ranting (scope tetap berlaku).
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getUserScope } from "@/app/lib/scope/getUserScope";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const raw = req.nextUrl.searchParams.get("ranting_ids")?.trim() ?? "";
  const admin = createSupabaseAdminClient();
  const scope = await getUserScope(admin, user.id);

  let rantingIds: string[] = [];
  if (raw) {
    rantingIds = raw.split(",").map((s) => s.trim()).filter(Boolean);
    if (rantingIds.length > 0 && !scope.is_pp && scope.ranting_ids.length > 0) {
      const allowed = new Set(scope.ranting_ids);
      rantingIds = rantingIds.filter((id) => allowed.has(id));
    }
  }

  let tahunList: { id: string; nama: string; tahun: number; periode: string }[] = [];
  if (scope.is_pp) {
    const res = await admin
      .from("ukt_tahun_ajaran")
      .select("id, nama, tahun, periode")
      .eq("is_active", true)
      .order("tahun", { ascending: false })
      .order("periode", { ascending: false })
      .limit(5);
    tahunList = (res.data ?? []) as typeof tahunList;
  } else {
    const [globalRes, cabangRes] = await Promise.all([
      admin
        .from("ukt_tahun_ajaran")
        .select("id, nama, tahun, periode")
        .eq("is_active", true)
        .is("cabang_id", null)
        .order("tahun", { ascending: false })
        .order("periode", { ascending: false })
        .limit(3),
      scope.cabang_ids.length > 0
        ? admin
            .from("ukt_tahun_ajaran")
            .select("id, nama, tahun, periode")
            .eq("is_active", true)
            .in("cabang_id", scope.cabang_ids)
            .order("tahun", { ascending: false })
            .order("periode", { ascending: false })
            .limit(3)
        : { data: [] },
    ]);
    type TahunRow = { id: string; nama: string; tahun: number; periode: string };
    const byId = new Map<string, TahunRow>();
    (globalRes.data ?? []).forEach((r: TahunRow) => byId.set(r.id, r));
    (cabangRes.data ?? []).forEach((r: TahunRow) => byId.set(r.id, r));
    tahunList = Array.from(byId.values()).sort((a, b) => {
      if (b.tahun !== a.tahun) return b.tahun - a.tahun;
      return (b.periode === "II" ? 1 : 0) - (a.periode === "II" ? 1 : 0);
    });
  }

  const tahun = tahunList.length > 0 ? tahunList[0] : null;
  if (!tahun) {
    return NextResponse.json({
      tahun_ajaran: null,
      total_peserta: 0,
    });
  }

  let total = 0;
  const idsToUse = rantingIds.length > 0 ? rantingIds : (scope.is_pp ? [] : scope.ranting_ids);
  if (scope.is_pp && idsToUse.length === 0) {
    const { count, error } = await admin
      .from("ukt_pendaftaran")
      .select("id", { count: "exact", head: true })
      .eq("tahun_ajaran_id", tahun.id)
      .neq("status_bayar", "batal");
    if (!error && count != null) total = count;
  } else if (idsToUse.length > 0) {
    const { count, error } = await admin
      .from("ukt_pendaftaran")
      .select("id", { count: "exact", head: true })
      .eq("tahun_ajaran_id", tahun.id)
      .in("ranting_id", idsToUse)
      .neq("status_bayar", "batal");
    if (!error && count != null) total = count;
  }

  return NextResponse.json({
    tahun_ajaran: { id: tahun.id, nama: tahun.nama },
    total_peserta: total,
  });
}
