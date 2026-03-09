/**
 * GET /api/ukt/kwitansi-ranting/verify?token=xxx
 * Verifikasi token kwitansi ranting. Public (untuk scan QR → cetak ulang).
 */
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";

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
  const token = req.nextUrl.searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ message: "token wajib" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  const { data: row, error } = await admin
    .from("ukt_kwitansi_ranting")
    .select("id, tahun_ajaran_id, ranting_id, no_kwitansi, created_at")
    .eq("token", token)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json(
      { message: "Kwitansi ranting tidak ditemukan" },
      { status: 404 }
    );
  }

  const [tahunRes, rantingRes, pendaftaranRes] = await Promise.all([
    admin
      .from("ukt_tahun_ajaran")
      .select("id, nama, biaya_per_kyu")
      .eq("id", row.tahun_ajaran_id)
      .maybeSingle(),
    admin
      .from("ranting")
      .select("id, nama")
      .eq("id", row.ranting_id)
      .maybeSingle(),
    admin
      .from("ukt_pendaftaran")
      .select("id, kyu_dan_terakhir, total_bayar")
      .eq("tahun_ajaran_id", row.tahun_ajaran_id)
      .eq("ranting_id", row.ranting_id)
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
      { message: "Data tahun atau ranting tidak ditemukan" },
      { status: 404 }
    );
  }

  const biayaPerKyu =
    tahun.biaya_per_kyu && typeof tahun.biaya_per_kyu === "object" && Object.keys(tahun.biaya_per_kyu).length > 0
      ? tahun.biaya_per_kyu
      : DEFAULT_BIAYA_KYU;

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
    token,
    no_kwitansi: row.no_kwitansi ?? `UKT-R-${String(row.id).slice(0, 8).toUpperCase()}`,
    ranting_nama: ranting.nama,
    jenis: "Ujian Kenaikan Tingkat (UKT)",
    event: tahun.nama,
    total_peserta: totalPeserta,
    potongan_per_peserta: POTONGAN_PER_PESERTA,
    A,
    B,
    C,
    tanggal: row.created_at ?? "",
    breakdown,
  });
}
