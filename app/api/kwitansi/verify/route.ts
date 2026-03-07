/**
 * GET /api/kwitansi/verify?token=xxx
 * Mengembalikan data kwitansi untuk token (dari ukt_pendaftaran.kwitansi_token).
 * Dipakai saat Ketua Ranting scan QR di kwitansi → buka halaman → cetak ulang.
 */
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ message: "token wajib" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  const { data: row, error } = await admin
    .from("ukt_pendaftaran")
    .select(`
      id,
      total_bayar,
      dikonfirmasi_at,
      created_at,
      profile_id,
      tahun_ajaran_id,
      ranting_id
    `)
    .eq("kwitansi_token", token)
    .eq("status_bayar", "lunas")
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ message: "Kwitansi tidak ditemukan" }, { status: 404 });
  }

  const profileIds = [row.profile_id];
  const tahunIds = [row.tahun_ajaran_id];
  const rantingIds = [row.ranting_id];

  const [profilesRes, tahunRes, rantingRes] = await Promise.all([
    admin.from("profiles").select("id, nama, nomor").in("id", profileIds),
    admin.from("ukt_tahun_ajaran").select("id, nama").in("id", tahunIds),
    admin.from("ranting").select("id, nama").in("id", rantingIds),
  ]);

  const profile = (profilesRes.data ?? [])[0] as { nama?: string; nomor?: string } | undefined;
  const tahun = (tahunRes.data ?? [])[0] as { nama?: string } | undefined;
  const ranting = (rantingRes.data ?? [])[0] as { nama?: string } | undefined;

  const nominal = row.total_bayar != null ? Number(row.total_bayar) : 0;
  const tanggal = row.dikonfirmasi_at ?? row.created_at ?? "";

  return NextResponse.json({
    id: String(row.id),
    token,
    no_kwitansi: `UKT-${String(row.id).slice(0, 8).toUpperCase()}`,
    nama: profile?.nama ?? "",
    nomor: profile?.nomor ?? "",
    jenis: "Ujian Kenaikan Tingkat (UKT)",
    event: tahun?.nama ?? "UKT",
    ranting: ranting?.nama ?? "",
    nominal,
    tanggal,
  });
}
