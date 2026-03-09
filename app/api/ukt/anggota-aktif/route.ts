import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getUserScope } from "@/app/lib/scope/getUserScope";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const rantingIdParam = req.nextUrl.searchParams.get("ranting_id")?.trim();
  const tahunAjaranId = req.nextUrl.searchParams.get("tahun_ajaran_id")?.trim() || null;
  const statusFilter = req.nextUrl.searchParams.get("status")?.trim().toUpperCase() || "AKTIF";
  if (!rantingIdParam) return NextResponse.json({ message: "ranting_id wajib" }, { status: 400 });
  const statusValue = statusFilter === "NONAKTIF" ? "NONAKTIF" : "AKTIF";
  const allRanting = rantingIdParam === "all";

  const admin = createSupabaseAdminClient();
  const scope = await getUserScope(admin, user.id);
  const { data: profile } = await admin.from("profiles").select("app_role, structural_level").eq("user_id", user.id).maybeSingle();
  const isSuperAdmin = (profile?.app_role as string | null)?.toUpperCase() === "SUPERADMIN";
  const { data: structural } = await admin.rpc("get_user_structural_roles", { p_user_id: user.id });
  const levels = (structural ?? []).filter((r: { active?: boolean }) => r.active !== false).map((r: { structural_level?: number }) => Number(r.structural_level) || 0);
  const profileLevel = Number((profile as { structural_level?: unknown } | null)?.structural_level) || 0;
  const maxStructuralLevel = Math.max(0, ...levels, profileLevel);
  const canSeeAllRanting = scope.is_pp || isSuperAdmin || maxStructuralLevel >= 3;

  if (!allRanting) {
    const can =
      isSuperAdmin ||
      scope.is_pp ||
      (scope.ranting_ids.length > 0 && scope.ranting_ids.includes(rantingIdParam));
    if (!can) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  } else {
    if (!canSeeAllRanting) return NextResponse.json({ message: "Forbidden: hanya level 3+ yang dapat melihat semua ranting" }, { status: 403 });
  }

  let rantingIds: string[] = [];
  if (allRanting) {
    const { data: rantingRows } = await admin.from("ranting").select("id").order("nama");
    rantingIds = (rantingRows ?? []).map((r: { id: string }) => r.id);
    if (rantingIds.length === 0) return NextResponse.json([]);
  } else {
    rantingIds = [rantingIdParam];
  }

  const { data: profiles, error: e1 } = await admin
    .from("profiles")
    .select("id, user_id, nama, nomor, status, nik, avatar_path, ranting_id")
    .in("ranting_id", rantingIds)
    .order("ranting_id")
    .order("nama");
  if (e1) return NextResponse.json({ message: e1.message }, { status: 500 });

  const list = (profiles ?? []) as Array<{
    id: string;
    ranting_id?: string | null;
    nama?: string | null;
    nomor?: string | null;
    status?: string | null;
    nik?: string | null;
    avatar_path?: string | null;
  }>;
  const ids = list.map((p) => p.id);

  const rantingIdToNama = new Map<string, string>();
  if (allRanting && rantingIds.length > 0) {
    const { data: rantingNama } = await admin.from("ranting").select("id, nama").in("id", rantingIds);
    (rantingNama ?? []).forEach((r: { id: string; nama?: string }) => rantingIdToNama.set(r.id, r.nama ?? r.id));
  } else if (!allRanting) {
    const { data: one } = await admin.from("ranting").select("id, nama").eq("id", rantingIdParam).maybeSingle();
    if (one) rantingIdToNama.set((one as { id: string }).id, (one as { nama?: string }).nama ?? rantingIdParam);
  }

  const terdaftarSet = new Set<string>();
  const batalSet = new Set<string>();
  if (tahunAjaranId && ids.length > 0) {
    const { data: pd } = await admin
      .from("ukt_pendaftaran")
      .select("profile_id, status_bayar")
      .eq("tahun_ajaran_id", tahunAjaranId)
      .in("profile_id", ids);
    (pd ?? []).forEach((r: { profile_id: string; status_bayar?: string }) => {
      if (r.status_bayar === "batal") batalSet.add(r.profile_id);
      else terdaftarSet.add(r.profile_id);
    });
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

  const filtered = list.filter((p) => {
    const s = (p.status ?? "").toUpperCase();
    if (statusValue === "AKTIF") return s !== "NONAKTIF";
    return s === "NONAKTIF";
  });
  const result = filtered.map((p) => {
    let avatarUrl: string | null = null;
    if (p.avatar_path) {
      const { data } = admin.storage
        .from("avatars_v2")
        .getPublicUrl(p.avatar_path);
      avatarUrl = data?.publicUrl ?? null;
    }
    const sudah_daftar = terdaftarSet.has(p.id);
    const sudah_batal = batalSet.has(p.id);
    const rid = p.ranting_id ?? null;
    const ranting_nama = rid ? rantingIdToNama.get(rid) ?? rid : null;
    return {
      profile_id: p.id,
      user_id: (p as { user_id?: string | null }).user_id ?? null,
      nama: p.nama ?? "",
      nomor: p.nomor ?? "",
      nik: p.nik ?? "",
      status: p.status ?? "",
      kyu_dan_terakhir: fmt(p.id),
      sudah_daftar,
      sudah_batal,
      avatar_url: avatarUrl,
      ...(allRanting && rid ? { ranting_id: rid, ranting_nama: ranting_nama ?? "" } : {}),
    };
  });

  return NextResponse.json(result);
}
