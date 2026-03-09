/**
 * GET /api/keuangan/pembayaran
 * Daftar pembayaran lunas UKT untuk bendahara. Query: tahun_ajaran_id (opsional).
 * Scope: PP = semua; Cabang/Ranting = sesuai ranting_ids.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getUserScope } from "@/app/lib/scope/getUserScope";
import { requireFunctionalRole } from "@/app/lib/security/requireFunctionalRole";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const gate = await requireFunctionalRole(user, "BENDAHARA");
  if (!gate.ok) {
    return NextResponse.json({ message: "Akses modul Keuangan hanya untuk Bendahara" }, { status: gate.status });
  }

  const { searchParams } = new URL(req.url);
  const tahunAjaranId = searchParams.get("tahun_ajaran_id")?.trim() || null;

  const admin = createSupabaseAdminClient();
  const scope = await getUserScope(admin, user.id);

  let query = admin
    .from("ukt_pendaftaran")
    .select("id, profile_id, ranting_id, tahun_ajaran_id, total_bayar, dikonfirmasi_at, created_at, kwitansi_token")
    .eq("status_bayar", "lunas")
    .order("dikonfirmasi_at", { ascending: false });

  if (!scope.is_pp) {
    if (scope.ranting_ids.length === 0) {
      return NextResponse.json({ list: [], tahun_list: [] });
    }
    query = query.in("ranting_id", scope.ranting_ids);
  }

  if (tahunAjaranId) {
    query = query.eq("tahun_ajaran_id", tahunAjaranId);
  }

  const { data: rows, error } = await query;

  if (error) {
    console.error("[keuangan/pembayaran GET]", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const list = (rows ?? []) as Array<{
    id: string;
    profile_id: string;
    ranting_id: string;
    tahun_ajaran_id: string;
    total_bayar: number | null;
    dikonfirmasi_at: string | null;
    created_at: string;
    kwitansi_token: string | null;
  }>;

  // Daftar tahun yang punya lunas (untuk dropdown) — dari semua lunas scope, bukan hanya hasil filter
  let tahunIdsForDropdown: string[] = Array.from(new Set(list.map((r) => r.tahun_ajaran_id)));
  if (tahunAjaranId) {
    const allLunasQuery = scope.is_pp
      ? admin.from("ukt_pendaftaran").select("tahun_ajaran_id").eq("status_bayar", "lunas")
      : admin.from("ukt_pendaftaran").select("tahun_ajaran_id").eq("status_bayar", "lunas").in("ranting_id", scope.ranting_ids);
    const { data: allLunas } = await allLunasQuery;
    tahunIdsForDropdown = Array.from(new Set((allLunas ?? []).map((r: { tahun_ajaran_id: string }) => r.tahun_ajaran_id)));
  }

  const profileIds = Array.from(new Set(list.map((r) => r.profile_id)));
  const tahunIds = Array.from(new Set(list.map((r) => r.tahun_ajaran_id)));
  const rantingIds = Array.from(new Set(list.map((r) => r.ranting_id)));

  const [profilesRes, tahunRes, rantingRes] = await Promise.all([
    profileIds.length > 0
      ? admin.from("profiles").select("id, nama, nomor").in("id", profileIds)
      : Promise.resolve({ data: [] }),
    tahunIds.length > 0
      ? admin.from("ukt_tahun_ajaran").select("id, nama").in("id", tahunIds)
      : Promise.resolve({ data: [] }),
    rantingIds.length > 0
      ? admin.from("ranting").select("id, nama").in("id", rantingIds)
      : Promise.resolve({ data: [] }),
  ]);

  const profileMap = new Map<string, { nama?: string; nomor?: string }>();
  (profilesRes.data ?? []).forEach((p: { id: string; nama?: string; nomor?: string }) => {
    profileMap.set(p.id, { nama: p.nama ?? undefined, nomor: p.nomor ?? undefined });
  });
  const tahunMap = new Map<string, string>();
  (tahunRes.data ?? []).forEach((t: { id: string; nama?: string }) => {
    tahunMap.set(t.id, t.nama ?? "UKT");
  });
  const rantingMap = new Map<string, string>();
  (rantingRes.data ?? []).forEach((r: { id: string; nama?: string }) => {
    rantingMap.set(r.id, r.nama ?? "");
  });

  const out = list.map((r) => {
    const profile = profileMap.get(r.profile_id);
    const nominal = r.total_bayar != null ? Number(r.total_bayar) : 0;
    const tanggal = r.dikonfirmasi_at ?? r.created_at ?? "";
    return {
      id: r.id,
      nama: profile?.nama ?? "",
      nomor: profile?.nomor ?? "",
      jenis: "Ujian Kenaikan Tingkat (UKT)",
      event: tahunMap.get(r.tahun_ajaran_id) ?? "UKT",
      ranting: rantingMap.get(r.ranting_id) ?? "",
      nominal,
      tanggal,
      kwitansi_token: r.kwitansi_token ?? null,
    };
  });

  // Daftar tahun ajaran untuk filter dropdown (semua tahun yang punya lunas di scope)
  const tahunIdsForList = tahunIdsForDropdown.length > 0 ? tahunIdsForDropdown : tahunIds;
  const tahunListRes = tahunIdsForList.length > 0
    ? await admin.from("ukt_tahun_ajaran").select("id, nama").in("id", tahunIdsForList)
    : { data: [] };
  const tahunList = ((tahunListRes as { data: Array<{ id: string; nama: string }> }).data ?? [])
    .map((t) => ({ id: t.id, nama: t.nama ?? t.id }))
    .sort((a, b) => a.nama.localeCompare(b.nama));

  return NextResponse.json({ list: out, tahun_list: tahunList });
}
