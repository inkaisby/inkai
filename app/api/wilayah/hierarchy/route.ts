import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getSessionUser } from "@/app/lib/supabase/session";
import { getUserScope } from "@/app/lib/scope/getUserScope";

export const runtime = "nodejs";

export type ProvinsiNode = {
  id: string;
  nama: string;
  aktif: boolean;
  cabang: CabangNode[];
};

export type CabangNode = {
  id: string;
  nama: string;
  provinsi_id: string;
  aktif: boolean;
  ranting: RantingNode[];
};

export type RantingNode = {
  id: string;
  nama: string;
  cabang_id: string | null;
  aktif: boolean;
};

/**
 * GET: Pohon hierarki organisasi INKAI (Provinsi → Cabang → Ranting).
 * Difilter menurut scope user: PP = semua, lain = hanya org di scope.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const scope = await getUserScope(admin, user.id);

  let provinsiQuery = admin.from("provinsi").select("id, nama, aktif").order("nama");
  let cabangQuery = admin.from("cabang").select("id, nama, provinsi_id, aktif").order("nama");
  let rantingQuery = admin.from("ranting").select("id, nama, cabang_id, aktif").order("nama");

  if (!scope.is_pp) {
    if (scope.provinsi_ids.length > 0) provinsiQuery = provinsiQuery.in("id", scope.provinsi_ids);
    else provinsiQuery = provinsiQuery.in("id", ["__none__"]);
    if (scope.cabang_ids.length > 0) cabangQuery = cabangQuery.in("id", scope.cabang_ids);
    else cabangQuery = cabangQuery.in("id", ["__none__"]);
    if (scope.ranting_ids.length > 0) rantingQuery = rantingQuery.in("id", scope.ranting_ids);
    else rantingQuery = rantingQuery.in("id", ["__none__"]);
  }

  const [provinsiRes, cabangRes, rantingRes] = await Promise.all([
    provinsiQuery,
    cabangQuery,
    rantingQuery,
  ]);

  if (provinsiRes.error) {
    return NextResponse.json(
      { message: provinsiRes.error.message },
      { status: 500 }
    );
  }
  if (cabangRes.error) {
    return NextResponse.json(
      { message: cabangRes.error.message },
      { status: 500 }
    );
  }
  if (rantingRes.error) {
    return NextResponse.json(
      { message: rantingRes.error.message },
      { status: 500 }
    );
  }

  const provinsiList = provinsiRes.data ?? [];
  const cabangList = cabangRes.data ?? [];
  const rantingList = rantingRes.data ?? [];
  const rantingIdSet = scope.is_pp ? null : new Set(scope.ranting_ids);

  const rantingByCabang = new Map<string, RantingNode[]>();
  const rantingTanpaCabang: RantingNode[] = [];
  for (const r of rantingList as RantingNode[]) {
    if (scope.is_pp || (rantingIdSet != null && rantingIdSet.has(r.id))) {
      if (r.cabang_id) {
        if (!rantingByCabang.has(r.cabang_id)) rantingByCabang.set(r.cabang_id, []);
        rantingByCabang.get(r.cabang_id)!.push(r);
      } else {
        rantingTanpaCabang.push(r);
      }
    }
  }

  const cabangByProvinsi = new Map<string, CabangNode[]>();
  for (const c of cabangList as CabangNode[]) {
    const pid = c.provinsi_id;
    if (!cabangByProvinsi.has(pid)) cabangByProvinsi.set(pid, []);
    const ranting = rantingByCabang.get(c.id) ?? [];
    cabangByProvinsi.get(pid)!.push({ ...c, ranting });
  }

  const hierarchy: ProvinsiNode[] = provinsiList.map((p: ProvinsiNode) => ({
    ...p,
    cabang: cabangByProvinsi.get(p.id) ?? [],
  }));

  return NextResponse.json({
    provinsi: hierarchy,
    ranting_tanpa_cabang: rantingTanpaCabang,
  });
}
