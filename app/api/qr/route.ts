/**
 * GET /api/qr?url=... — Generate QR code as data URL (server-side).
 * Dipakai oleh client untuk cetak PDF kwitansi tanpa import "qrcode" di bundle client.
 */
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url")?.trim();
  if (!url) {
    return NextResponse.json({ message: "Parameter url wajib" }, { status: 400 });
  }
  try {
    const QRCode = (await import("qrcode")).default;
    const dataUrl = await QRCode.toDataURL(url, { width: 120, margin: 1 });
    return NextResponse.json({ dataUrl });
  } catch (e) {
    console.error("[api/qr]", e);
    return NextResponse.json({ message: "Gagal generate QR" }, { status: 500 });
  }
}
