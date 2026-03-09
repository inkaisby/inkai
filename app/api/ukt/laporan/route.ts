/**
 * GET /api/ukt/laporan
 * Laporan peserta lulus UKT untuk PP (penerbitan ijazah).
 * Data dari ukt_pendaftaran (lunas + lulus) digabung dengan profiles, ranting, cabang, tahun_ajaran.
 *
 * Query: tahun_ajaran_id (wajib), ranting_id (opsional)
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getUserScope } from "@/app/lib/scope/getUserScope";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const tahunAjaranId = searchParams.get("tahun_ajaran_id")?.trim();
  const rantingId = searchParams.get("ranting_id")?.trim() || null;

  if (!tahunAjaranId) {
    return NextResponse.json(
      { message: "tahun_ajaran_id wajib" },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdminClient();
  const scope = await getUserScope(admin, user.id);

  let query = admin
    .from("ukt_pendaftaran")
    .select(
      "id, profile_id, ranting_id, kyu_dan_terakhir, tingkat_lulus, dikonfirmasi_at, created_at"
    )
    .eq("tahun_ajaran_id", tahunAjaranId)
    .eq("status_bayar", "lunas")
    .eq("lulus", true)
    .order("created_at", { ascending: false });

  if (!scope.is_pp && scope.ranting_ids.length > 0) {
    query = query.in("ranting_id", scope.ranting_ids);
  }
  if (rantingId) {
    query = query.eq("ranting_id", rantingId);
  }

  const { data: rows, error } = await query;

  if (error) {
    console.error("[ukt/laporan]", error);
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }

  const list = (rows ?? []) as Array<{
    id: string;
    profile_id: string;
    ranting_id: string;
    kyu_dan_terakhir: string | null;
    tingkat_lulus: number | null;
    dikonfirmasi_at: string | null;
    created_at: string;
  }>;

  if (list.length === 0) {
    return NextResponse.json({
      list: [],
      tahun_nama: null,
    });
  }

  const profileIds = Array.from(new Set(list.map((r) => r.profile_id)));
  const rantingIds = Array.from(new Set(list.map((r) => r.ranting_id)));

  const [tahunRes, profileRes, rantingRes] = await Promise.all([
    admin
      .from("ukt_tahun_ajaran")
      .select("id, nama, tahun, periode")
      .eq("id", tahunAjaranId)
      .maybeSingle(),
    admin
      .from("profiles")
      .select("id, nama, nomor")
      .in("id", profileIds),
    admin
      .from("ranting")
      .select("id, nama, cabang_id")
      .in("id", rantingIds),
  ]);

  const cabangIds = Array.from(
    new Set(
      (rantingRes.data ?? [])
        .map((r: { cabang_id?: string | null }) => r.cabang_id)
        .filter(Boolean) as string[]
    )
  );

  const cabangRes =
    cabangIds.length > 0
      ? await admin
          .from("cabang")
          .select("id, nama")
          .in("id", cabangIds)
      : { data: [] };

  const profileMap = new Map<string, { nama?: string; nomor?: string }>();
  (profileRes.data ?? []).forEach((p: { id: string; nama?: string; nomor?: string }) => {
    profileMap.set(p.id, { nama: p.nama ?? "", nomor: p.nomor ?? "" });
  });

  const rantingMap = new Map<string, { nama?: string; cabang_id?: string | null }>();
  (rantingRes.data ?? []).forEach((r: { id: string; nama?: string; cabang_id?: string | null }) => {
    rantingMap.set(r.id, { nama: r.nama ?? "", cabang_id: r.cabang_id });
  });

  const cabangMap = new Map<string, string>();
  (cabangRes.data ?? []).forEach((c: { id: string; nama?: string }) => {
    cabangMap.set(c.id, c.nama ?? c.id);
  });

  const result = list.map((r) => {
    const profile = profileMap.get(r.profile_id);
    const ranting = rantingMap.get(r.ranting_id);
    const cabangNama = ranting?.cabang_id
      ? cabangMap.get(ranting.cabang_id) ?? ""
      : "";

    return {
      id: r.id,
      profile_id: r.profile_id,
      nama: profile?.nama ?? "",
      nomor: profile?.nomor ?? "",
      ranting_id: r.ranting_id,
      ranting_nama: ranting?.nama ?? "",
      cabang_nama: cabangNama,
      kyu_dan_terakhir: r.kyu_dan_terakhir ?? "",
      tingkat_lulus: r.tingkat_lulus,
      tingkat_lulus_label: r.tingkat_lulus
        ? `Kyu ${r.tingkat_lulus}`
        : "",
      dikonfirmasi_at: r.dikonfirmasi_at,
      created_at: r.created_at,
    };
  });

  const tahunNama = (tahunRes.data as { nama?: string } | null)?.nama ?? null;

  return NextResponse.json({
    list: result,
    tahun_nama: tahunNama,
  });
}
