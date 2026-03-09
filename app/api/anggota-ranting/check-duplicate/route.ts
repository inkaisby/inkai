/**
 * GET /api/anggota-ranting/check-duplicate?nik=xxx&nomor=yyy&nama=zzz&exclude_profile_id=zzz
 * Cek duplikat NIK, No. Anggota, dan nama mirip di SEMUA wilayah (global).
 * exclude_profile_id: untuk form edit, abaikan profil ini.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getUserScope } from "@/app/lib/scope/getUserScope";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function normalizeName(s: string): string {
  return s
    .trim()
    .replace(/[^a-z0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const nik = searchParams.get("nik")?.trim();
  const nomor = searchParams.get("nomor")?.trim();
  const nama = searchParams.get("nama")?.trim();
  const excludeProfileId = searchParams.get("exclude_profile_id")?.trim();

  if (!nik && !nomor && !nama) {
    return NextResponse.json(
      { message: "Berikan nik, nomor, atau nama untuk dicek" },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdminClient();
  const scope = await getUserScope(admin, user.id);
  if (!scope.is_pp && scope.ranting_ids.length === 0 && (scope.cabang_ids?.length ?? 0) === 0) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const result: {
    nik_dup?: { id: string; nama: string };
    nomor_dup?: { id: string; nama: string };
    nama_similar?: { id: string; nama: string }[];
  } = {};

  if (nik) {
    let q = admin
      .from("profiles")
      .select("id, nama")
      .eq("nik", nik);
    if (excludeProfileId) q = q.neq("id", excludeProfileId);
    const { data } = await q.maybeSingle();
    if (data) {
      result.nik_dup = { id: String(data.id), nama: String((data as { nama?: string }).nama ?? "") };
    }
  }

  if (nomor) {
    let q = admin
      .from("profiles")
      .select("id, nama")
      .eq("nomor", nomor);
    if (excludeProfileId) q = q.neq("id", excludeProfileId);
    const { data } = await q.maybeSingle();
    if (data) {
      result.nomor_dup = { id: String(data.id), nama: String((data as { nama?: string }).nama ?? "") };
    }
  }

  if (nama) {
    const normalized = normalizeName(nama);
    if (normalized) {
      const { data: rows } = await admin
        .from("profiles")
        .select("id, nama")
        .limit(10000);
      const similar = (rows ?? []).filter((r) => {
        const rNorm = normalizeName((r as { nama?: string }).nama ?? "");
        if (!rNorm) return false;
        if (excludeProfileId && (r as { id?: string }).id === excludeProfileId) return false;
        return rNorm === normalized;
      });
      if (similar.length > 0) {
        result.nama_similar = similar.map((r) => ({
          id: String((r as { id?: string }).id ?? ""),
          nama: String((r as { nama?: string }).nama ?? ""),
        }));
      }
    }
  }

  return NextResponse.json(result);
}
