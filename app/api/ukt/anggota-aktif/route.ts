import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getUserScope } from "@/app/lib/scope/getUserScope";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const rantingId = req.nextUrl.searchParams.get("ranting_id")?.trim();
  const tahunAjaranId = req.nextUrl.searchParams.get("tahun_ajaran_id")?.trim() || null;
  if (!rantingId) return NextResponse.json({ message: "ranting_id wajib" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const scope = await getUserScope(admin, user.id);
  const can = scope.is_pp || (scope.ranting_ids.length > 0 && scope.ranting_ids.includes(rantingId));
  if (!can) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const { data: profiles, error: e1 } = await admin
    .from("profiles")
    .select("id, user_id, nama, nomor, status, nik")
    .eq("ranting_id", rantingId)
    .not("nomor", "is", null)
    .order("nama");
  if (e1) return NextResponse.json({ message: e1.message }, { status: 500 });

  const list = (profiles ?? []) as Array<{
    id: string;
    nama?: string | null;
    nomor?: string | null;
    status?: string | null;
    nik?: string | null;
  }>;
  const ids = list.map((p) => p.id);

  const terdaftarSet = new Set<string>();
  if (tahunAjaranId && ids.length > 0) {
    const { data: pd } = await admin
      .from("ukt_pendaftaran")
      .select("profile_id")
      .eq("tahun_ajaran_id", tahunAjaranId)
      .in("profile_id", ids)
      .neq("status_bayar", "batal");
    (pd ?? []).forEach((r: { profile_id: string }) => terdaftarSet.add(r.profile_id));
  }

  const kyuMap = new Map<string, number>();
  const danMap = new Map<string, number>();
  if (ids.length > 0) {
    const [kr, dr] = await Promise.all([
      admin.from("kyu").select("profile_id, level").in("profile_id", ids),
      admin.from("dan").select("profile_id, dan").in("profile_id", ids),
    ]);
    (kr.data ?? []).forEach((r: { profile_id: string; level: number }) => {
      const cur = kyuMap.get(r.profile_id);
      if (cur == null || r.level > cur) kyuMap.set(r.profile_id, r.level);
    });
    (dr.data ?? []).forEach((r: { profile_id: string; dan: number }) => {
      const cur = danMap.get(r.profile_id);
      if (cur == null || r.dan > cur) danMap.set(r.profile_id, r.dan);
    });
  }

  const fmt = (pid: string) => {
    const d = danMap.get(pid);
    if (d != null && d > 0) return "Dan " + d;
    const k = kyuMap.get(pid);
    if (k != null && k > 0) return "Kyu " + k;
    return "—";
  };

  const aktif = list.filter((p) => (p.status ?? "").toUpperCase() === "AKTIF");
  const result = aktif.map((p) => ({
    profile_id: p.id,
    nama: p.nama ?? "",
    nomor: p.nomor ?? "",
    nik: p.nik ?? "",
    status: p.status ?? "",
    kyu_dan_terakhir: fmt(p.id),
    sudah_daftar: terdaftarSet.has(p.id),
  }));

  return NextResponse.json(result);
}
