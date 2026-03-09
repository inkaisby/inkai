/**
 * GET: Ringkasan jumlah anggota (aktif/nonaktif) per ranting.
 * Query: ranting_ids (opsional, comma-separated). Jika tidak ada, pakai scope.ranting_ids.
 * Response: { items: [{ ranting_id, ranting_nama, count_aktif, count_nonaktif }], total_aktif, total_nonaktif }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getUserScope } from "@/app/lib/scope/getUserScope";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const raw = req.nextUrl.searchParams.get("ranting_ids")?.trim() ?? "";
  const admin = createSupabaseAdminClient();
  const scope = await getUserScope(admin, user.id);
  const { data: profile } = await admin.from("profiles").select("app_role").eq("user_id", user.id).maybeSingle();
  const isSuperAdmin = (profile?.app_role as string | null)?.toUpperCase() === "SUPERADMIN";
  const canSeeAll = scope.is_pp || isSuperAdmin;

  let rantingIds: string[] = [];
  if (raw) {
    rantingIds = raw.split(",").map((s) => s.trim()).filter(Boolean);
    if (rantingIds.length === 0) {
      return NextResponse.json({ items: [], total_aktif: 0, total_nonaktif: 0 });
    }
    if (!canSeeAll && scope.ranting_ids.length > 0) {
      const allowed = new Set(scope.ranting_ids);
      rantingIds = rantingIds.filter((id) => allowed.has(id));
    }
  } else {
    if (canSeeAll) {
      const { data: all } = await admin.from("ranting").select("id").order("nama");
      rantingIds = (all ?? []).map((r: { id: string }) => r.id);
    } else {
      rantingIds = scope.ranting_ids.slice();
    }
  }

  if (rantingIds.length === 0) {
    return NextResponse.json({ items: [], total_aktif: 0, total_nonaktif: 0 });
  }

  const { data: rantingRows } = await admin
    .from("ranting")
    .select("id, nama")
    .in("id", rantingIds);
  const rantingMap = new Map(
    (rantingRows ?? []).map((r: { id: string; nama: string }) => [r.id, r.nama ?? r.id])
  );

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, ranting_id, status")
    .in("ranting_id", rantingIds);

  const list = (profiles ?? []) as Array<{ id: string; ranting_id: string | null; status?: string | null }>;
  const byRanting = new Map<
    string,
    { count_aktif: number; count_nonaktif: number }
  >();
  for (const rid of rantingIds) {
    byRanting.set(rid, { count_aktif: 0, count_nonaktif: 0 });
  }
  for (const p of list) {
    const rid = p.ranting_id ?? "";
    const row = byRanting.get(rid);
    if (!row) continue;
    const s = (p.status ?? "").toUpperCase();
    if (s === "NONAKTIF") row.count_nonaktif += 1;
    else row.count_aktif += 1;
  }

  let total_aktif = 0;
  let total_nonaktif = 0;
  const items = rantingIds.map((rid) => {
    const row = byRanting.get(rid) ?? { count_aktif: 0, count_nonaktif: 0 };
    total_aktif += row.count_aktif;
    total_nonaktif += row.count_nonaktif;
    return {
      ranting_id: rid,
      ranting_nama: rantingMap.get(rid) ?? rid,
      count_aktif: row.count_aktif,
      count_nonaktif: row.count_nonaktif,
    };
  });

  return NextResponse.json({
    items,
    total_aktif,
    total_nonaktif,
  });
}
