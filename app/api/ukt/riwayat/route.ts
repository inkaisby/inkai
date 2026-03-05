/**
 * GET: Riwayat pendaftaran UKT (untuk tab Riwayat UKT).
 * Query opsional: tahun_ajaran_id, ranting_id. Urut created_at desc, limit 300.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getUserScope } from "@/app/lib/scope/getUserScope";
import { getPublicUrl } from "@/app/lib/storage/ijazah";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const LIMIT = 300;

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const tahunAjaranId = searchParams.get("tahun_ajaran_id")?.trim() || null;
  const rantingId = searchParams.get("ranting_id")?.trim() || null;

  const admin = createSupabaseAdminClient();
  const scope = await getUserScope(admin, user.id);

  let query = admin
    .from("ukt_pendaftaran")
    .select(
      "id, tahun_ajaran_id, ranting_id, profile_id, kyu_dan_terakhir, status_bayar, total_bayar, bukti_transfer_path, created_at, dikonfirmasi_at"
    )
    .neq("status_bayar", "batal")
    .order("created_at", { ascending: false })
    .limit(LIMIT);

  if (!scope.is_pp && scope.ranting_ids.length > 0) {
    query = query.in("ranting_id", scope.ranting_ids);
  }
  if (tahunAjaranId) query = query.eq("tahun_ajaran_id", tahunAjaranId);
  if (rantingId) query = query.eq("ranting_id", rantingId);

  const { data: rows, error } = await query;

  if (error) {
    console.error("[ukt/riwayat GET]", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const list = (rows ?? []) as Array<{
    id: string;
    tahun_ajaran_id: string;
    ranting_id: string;
    profile_id: string;
    kyu_dan_terakhir: string | null;
    status_bayar: string;
    total_bayar: number | null;
    bukti_transfer_path: string | null;
    created_at: string;
    dikonfirmasi_at: string | null;
  }>;

  const tahunIds = [...new Set(list.map((r) => r.tahun_ajaran_id))];
  const rantingIds = [...new Set(list.map((r) => r.ranting_id))];
  const profileIds = [...new Set(list.map((r) => r.profile_id))];

  const [tahunRes, rantingRes, profileRes] = await Promise.all([
    tahunIds.length > 0
      ? admin.from("ukt_tahun_ajaran").select("id, nama").in("id", tahunIds)
      : Promise.resolve({ data: [] }),
    rantingIds.length > 0
      ? admin.from("ranting").select("id, nama").in("id", rantingIds)
      : Promise.resolve({ data: [] }),
    profileIds.length > 0
      ? admin.from("profiles").select("id, nama, nomor").in("id", profileIds)
      : Promise.resolve({ data: [] }),
  ]);

  const tahunMap = new Map<string, string>();
  (tahunRes.data ?? []).forEach((t: { id: string; nama: string }) => tahunMap.set(t.id, t.nama));
  const rantingMap = new Map<string, string>();
  (rantingRes.data ?? []).forEach((r: { id: string; nama: string }) => rantingMap.set(r.id, r.nama));
  const profileMap = new Map<string, { nama?: string; nomor?: string }>();
  (profileRes.data ?? []).forEach((p: { id: string; nama?: string; nomor?: string }) =>
    profileMap.set(p.id, { nama: p.nama, nomor: p.nomor })
  );

  const result = list.map((r) => {
    const profile = profileMap.get(r.profile_id);
    return {
      id: r.id,
      tahun_ajaran_nama: tahunMap.get(r.tahun_ajaran_id) ?? "—",
      ranting_nama: rantingMap.get(r.ranting_id) ?? "—",
      nama: profile?.nama ?? "",
      nomor: profile?.nomor ?? "",
      kyu_dan_terakhir: r.kyu_dan_terakhir ?? "",
      status_bayar: r.status_bayar,
      total_bayar: r.total_bayar ?? null,
      file_url: getPublicUrl(r.bukti_transfer_path) ?? null,
      created_at: r.created_at,
      dikonfirmasi_at: r.dikonfirmasi_at ?? null,
    };
  });

  return NextResponse.json({ list: result });
}
