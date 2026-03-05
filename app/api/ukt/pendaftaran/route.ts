/**
 * GET: Daftar pendaftaran UKT (resume panel). Query: tahun_ajaran_id, ranting_id.
 * POST: Daftarkan peserta. Body: tahun_ajaran_id, profile_id, ranting_id, kyu_dan_terakhir.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getUserScope } from "@/app/lib/scope/getUserScope";
import { getPublicUrl } from "@/app/lib/storage/ijazah";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const tahunAjaranId = searchParams.get("tahun_ajaran_id")?.trim();
  const rantingId = searchParams.get("ranting_id")?.trim();

  if (!tahunAjaranId || !rantingId) {
    return NextResponse.json(
      { message: "tahun_ajaran_id dan ranting_id wajib" },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdminClient();
  const scope = await getUserScope(admin, user.id);
  const canAccess =
    scope.is_pp || (scope.ranting_ids.length > 0 && scope.ranting_ids.includes(rantingId));
  if (!canAccess) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { data: rows, error } = await admin
    .from("ukt_pendaftaran")
    .select("id, profile_id, ranting_id, kyu_dan_terakhir, status_bayar, total_bayar, bukti_transfer_path, dikonfirmasi_at, created_at")
    .eq("tahun_ajaran_id", tahunAjaranId)
    .eq("ranting_id", rantingId)
    .neq("status_bayar", "batal")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[ukt/pendaftaran GET]", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const rawList = (rows ?? []) as Array<{ profile_id: string }>;
  const profileIds = [...new Set(rawList.map((r) => r.profile_id))];
  const profileMap = new Map<string, { nama?: string; nomor?: string }>();
  if (profileIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, nama, nomor")
      .in("id", profileIds);
    (profiles ?? []).forEach((p: { id: string; nama?: string; nomor?: string }) => {
      profileMap.set(p.id, { nama: p.nama ?? undefined, nomor: p.nomor ?? undefined });
    });
  }

  const list = rawList.map((r: Record<string, unknown>) => {
    const profile = profileMap.get(r.profile_id as string);
    const buktiPath = (r.bukti_transfer_path as string) ?? null;
    return {
      id: r.id,
      profile_id: r.profile_id,
      ranting_id: r.ranting_id,
      kyu_dan_terakhir: r.kyu_dan_terakhir ?? "",
      status_bayar: r.status_bayar ?? "menunggu_bayar",
      total_bayar: r.total_bayar ?? null,
      bukti_transfer_path: buktiPath,
      file_url: getPublicUrl(buktiPath) ?? null,
      dikonfirmasi_at: r.dikonfirmasi_at ?? null,
      created_at: r.created_at,
      nama: profile?.nama ?? "",
      nomor: profile?.nomor ?? "",
    };
  });

  const total_bayar = list.reduce(
    (sum: number, r: { status_bayar?: string; total_bayar?: number | null }) =>
      r.status_bayar === "lunas" && r.total_bayar != null ? sum + Number(r.total_bayar) : sum,
    0
  );
  const belum_bayar = list.filter((r: { status_bayar?: string }) => r.status_bayar === "menunggu_bayar").length;
  const lunas = list.filter((r: { status_bayar?: string }) => r.status_bayar === "lunas").length;

  return NextResponse.json({
    list,
    summary: { total: list.length, belum_bayar, lunas, total_bayar },
  });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: {
    tahun_ajaran_id?: string;
    profile_id?: string;
    ranting_id?: string;
    kyu_dan_terakhir?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Body harus JSON" }, { status: 400 });
  }

  const tahunAjaranId = body.tahun_ajaran_id?.trim();
  const profileId = body.profile_id?.trim();
  const rantingId = body.ranting_id?.trim();
  const kyuDanTerakhir = body.kyu_dan_terakhir?.trim() ?? null;

  if (!tahunAjaranId || !profileId || !rantingId) {
    return NextResponse.json(
      { message: "tahun_ajaran_id, profile_id, ranting_id wajib" },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdminClient();
  const scope = await getUserScope(admin, user.id);
  const canAccess =
    scope.is_pp || (scope.ranting_ids.length > 0 && scope.ranting_ids.includes(rantingId));
  if (!canAccess) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await admin
    .from("ukt_pendaftaran")
    .insert({
      tahun_ajaran_id: tahunAjaranId,
      profile_id: profileId,
      ranting_id: rantingId,
      kyu_dan_terakhir: kyuDanTerakhir,
      status_bayar: "menunggu_bayar",
    })
    .select("id, profile_id, ranting_id, kyu_dan_terakhir, status_bayar, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { message: "Peserta sudah terdaftar untuk tahun ajaran ini" },
        { status: 409 }
      );
    }
    console.error("[ukt/pendaftaran POST]", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
