/**
 * GET /api/kwitansi/by-number?no=UKT-A23F0323&nominal=345000
 * Cari kwitansi berdasarkan no. kwitansi (UKT-xxxxxxxx). Mengembalikan token untuk buka /kwitansi?token=...
 * Jika nominal diberikan, token hanya dikembalikan jika nominal cocok (verifikasi tambahan).
 */
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const no = req.nextUrl.searchParams.get("no")?.trim();
  if (!no) {
    return NextResponse.json({ message: "no wajib (contoh: UKT-A23F0323)" }, { status: 400 });
  }

  const nominalParam = req.nextUrl.searchParams.get("nominal")?.trim() ?? "";
  const nominal =
    nominalParam.length > 0
      ? Number(String(nominalParam).replace(/[^\d]/g, ""))
      : null;
  if (nominalParam.length > 0 && (!nominal || Number.isNaN(nominal) || nominal <= 0)) {
    return NextResponse.json({ message: "nominal tidak valid (contoh: 345000)" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  const { data: token, error } = await admin.rpc("get_kwitansi_token_by_no_secure", {
    p_no: no,
    p_nominal: nominal,
  });

  if (error) {
    console.error("[kwitansi/by-number]", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  if (!token || typeof token !== "string") {
    return NextResponse.json({ message: "Kwitansi tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ token });
}
