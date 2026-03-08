/**
 * GET /api/ukt/ringkasan
 * Ringkasan dari tabel Supabase: ujian, ujian_peserta, ujian_hasil.
 */
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";

const emptyPayload = () =>
  NextResponse.json({
    totalUjian: 0,
    totalPeserta: 0,
    pesertaLulus: 0,
    ujianTerbaru: [],
    hasilTerbaru: [],
  });

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const admin = createSupabaseAdminClient();

    const defaultPayload = {
      totalUjian: 0,
      totalPeserta: 0,
      pesertaLulus: 0,
      ujianTerbaru: [] as { id: string; judul: string; kategori: string; tingkat: string; tanggal: string; status: string; created_at: string }[],
      hasilTerbaru: [] as { id: string; nilai: number; nilai_maks: number; lulus: boolean; target_tingkat: string; created_at: string }[],
    };

    const ujianCountRes = await admin.from("ujian").select("*", { count: "exact", head: true });
    const pesertaCountRes = await admin.from("ujian_peserta").select("*", { count: "exact", head: true });
    const lulusRes = await admin.from("ujian_hasil").select("id", { count: "exact", head: true }).eq("lulus", true);
    const ujianListRes = await admin
      .from("ujian")
      .select("id, judul, kategori, tingkat, tanggal, status, created_at")
      .order("tanggal", { ascending: false })
      .limit(10);
    const hasilListRes = await admin
      .from("ujian_hasil")
      .select("id, nilai, nilai_maks, lulus, target_tingkat, created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    defaultPayload.totalUjian = ujianCountRes.error ? 0 : (ujianCountRes.count ?? 0);
    defaultPayload.totalPeserta = pesertaCountRes.error ? 0 : (pesertaCountRes.count ?? 0);
    defaultPayload.pesertaLulus = lulusRes.error ? 0 : (lulusRes.count ?? 0);

    if (!ujianListRes.error && ujianListRes.data) {
      defaultPayload.ujianTerbaru = ujianListRes.data.map((r: Record<string, unknown>) => ({
        id: String(r.id ?? ""),
        judul: String(r.judul ?? ""),
        kategori: String(r.kategori ?? ""),
        tingkat: String(r.tingkat ?? ""),
        tanggal: String(r.tanggal ?? ""),
        status: String(r.status ?? ""),
        created_at: String(r.created_at ?? ""),
      }));
    }

    if (!hasilListRes.error && hasilListRes.data) {
      defaultPayload.hasilTerbaru = hasilListRes.data.map((r: Record<string, unknown>) => ({
        id: String(r.id ?? ""),
        nilai: Number(r.nilai ?? 0),
        nilai_maks: Number(r.nilai_maks ?? 0),
        lulus: Boolean(r.lulus),
        target_tingkat: String(r.target_tingkat ?? ""),
        created_at: String(r.created_at ?? ""),
      }));
    }

    return NextResponse.json(defaultPayload);
  } catch (e) {
    console.error("[ukt/ringkasan]", e);
    return emptyPayload();
  }
}
