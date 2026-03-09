/**
 * GET /api/ukt/kwitansi-ranting?tahun_ajaran_id=xxx&ranting_id=xxx
 * Data kwitansi per ranting: A (total biaya tiap kyu), B (potongan 50.000 × peserta), C = A - B.
 * Hanya peserta status_bayar = lunas.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getUserScope } from "@/app/lib/scope/getUserScope";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const POTONGAN_PER_PESERTA = 50_000;

/** Default biaya per Kyu/Dan (Rp) jika tahun ajaran belum diset cabang — selaras dengan PendaftaranUKT. */
const DEFAULT_BIAYA_KYU: Record<string, number> = {
  "1": 345000,
  "2": 345000,
  "3": 345000,
  "4": 315000,
  "5": 315000,
  "6": 305000,
  "7": 295000,
  "8": 295000,
  "9": 285000,
  "10": 285000,
  dan_1: 0,
  dan_2: 0,
  dan_3: 0,
};

/** Map kyu_dan_terakhir (e.g. "Kyu 5", "Dan 1") ke key biaya_per_kyu ("5", "dan_1"). */
function kyuDanToBiayaKey(kyuDan: string): string | null {
  const s = (kyuDan ?? "").trim();
  if (!s || s === "—") return null;
  const kyuMatch = /^Kyu\s*(\d+)$/i.exec(s);
  if (kyuMatch) return kyuMatch[1];
  const danMatch = /^Dan\s*(\d+)$/i.exec(s);
  if (danMatch) return "dan_" + danMatch[1];
  if (/^\d+$/.test(s)) return s;
  return null;
}

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
  const { data: profile } = await admin
    .from("profiles")
    .select("app_role, structural_level")
    .eq("user_id", user.id)
    .maybeSingle();
  const isSuperAdmin =
    (profile?.app_role as string | null)?.toUpperCase() === "SUPERADMIN";
  const canAccess =
    isSuperAdmin ||
    scope.is_pp ||
    (scope.ranting_ids.length > 0 && scope.ranting_ids.includes(rantingId));

  if (!canAccess) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const [tahunRes, rantingRes, pendaftaranRes] = await Promise.all([
    admin
      .from("ukt_tahun_ajaran")
      .select("id, nama, biaya_per_kyu")
      .eq("id", tahunAjaranId)
      .maybeSingle(),
    admin.from("ranting").select("id, nama").eq("id", rantingId).maybeSingle(),
    admin
      .from("ukt_pendaftaran")
      .select("id, kyu_dan_terakhir, total_bayar")
      .eq("tahun_ajaran_id", tahunAjaranId)
      .eq("ranting_id", rantingId)
      .eq("status_bayar", "lunas"),
  ]);

  const tahun = tahunRes.data as {
    id: string;
    nama: string;
    biaya_per_kyu?: Record<string, number> | null;
  } | null;
  const ranting = rantingRes.data as { id: string; nama: string } | null;
  const pendaftaran = (pendaftaranRes.data ?? []) as {
    id: string;
    kyu_dan_terakhir: string | null;
    total_bayar: number | null;
  }[];

  if (!tahun || !ranting) {
    return NextResponse.json(
      { message: "Tahun ajaran atau ranting tidak ditemukan" },
      { status: 404 }
    );
  }

  const biayaPerKyu =
    tahun.biaya_per_kyu && typeof tahun.biaya_per_kyu === "object" && Object.keys(tahun.biaya_per_kyu).length > 0
      ? tahun.biaya_per_kyu
      : DEFAULT_BIAYA_KYU;

  /** Per kyu: { key, label, jumlah, biayaSatuan, subtotal } */
  const byKyu: Record<
    string,
    { key: string; label: string; jumlah: number; biayaSatuan: number; subtotal: number }
  > = {};

  for (const p of pendaftaran) {
    const key = kyuDanToBiayaKey(p.kyu_dan_terakhir ?? "");
    const k = key ?? "unknown";
    const label =
      key?.startsWith("dan_")
        ? `Dan ${key.replace("dan_", "")}`
        : key
          ? `Kyu ${key}`
          : "Lainnya";
    const dariBiayaKyu =
      biayaPerKyu && key ? Number(biayaPerKyu[key]) ?? 0 : 0;
    const dariTotalBayar = p.total_bayar != null ? Number(p.total_bayar) : 0;
    const biayaSatuan = dariBiayaKyu > 0 ? dariBiayaKyu : (dariTotalBayar > 0 ? dariTotalBayar : 0);

    if (!byKyu[k]) {
      byKyu[k] = { key: k, label, jumlah: 0, biayaSatuan: 0, subtotal: 0 };
    }
    byKyu[k].jumlah += 1;
    byKyu[k].subtotal += biayaSatuan;
  }
  for (const r of Object.values(byKyu)) {
    r.biayaSatuan = r.jumlah > 0 ? Math.round(r.subtotal / r.jumlah) : 0;
  }

  const breakdown = Object.values(byKyu).sort((a, b) => {
    if (a.key.startsWith("dan_") && !b.key.startsWith("dan_")) return 1;
    if (!a.key.startsWith("dan_") && b.key.startsWith("dan_")) return -1;
    const na = parseInt(a.key.replace("dan_", ""), 10);
    const nb = parseInt(b.key.replace("dan_", ""), 10);
    return na - nb;
  });

  const totalPeserta = pendaftaran.length;
  const A = breakdown.reduce((sum, r) => sum + r.subtotal, 0);
  const B = totalPeserta * POTONGAN_PER_PESERTA;
  const C = Math.max(0, A - B);

  return NextResponse.json({
    ranting_id: ranting.id,
    ranting_nama: ranting.nama,
    tahun_ajaran_id: tahun.id,
    tahun_ajaran_nama: tahun.nama,
    total_peserta: totalPeserta,
    breakdown,
    A,
    B,
    C,
    potongan_per_peserta: POTONGAN_PER_PESERTA,
  });
}
