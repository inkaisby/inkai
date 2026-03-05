import { NextRequest, NextResponse } from "next/server";
import { getAreaNameById } from "@/app/lib/wilayah-from-package";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/wilayah/name?id=35782110
 * Mengembalikan nama kelurahan/kecamatan sesuai ID (agar tampil nama, bukan angka).
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id")?.trim() ?? "";
  if (!id) {
    return NextResponse.json({ name: null }, { status: 200 });
  }
  try {
    const name = await getAreaNameById(id);
    return NextResponse.json({ name });
  } catch (err) {
    console.error("[API wilayah/name]", err);
    return NextResponse.json({ name: null }, { status: 200 });
  }
}
