/**
 * GET: Daftar tahun ajaran UKT (untuk dropdown).
 * POST: Tambah tahun ajaran (Superadmin).
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { requireSuperadmin } from "@/app/lib/security/requireSuperadmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("ukt_tahun_ajaran")
    .select("id, nama, tahun, periode, is_active, created_at")
    .order("tahun", { ascending: false })
    .order("periode", { ascending: false });

  if (error) {
    console.error("[ukt/tahun-ajaran GET]", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const gate = await requireSuperadmin(user);
  if (!gate.ok) {
    return NextResponse.json({ message: "Forbidden" }, { status: gate.status });
  }

  let body: { nama?: string; tahun?: number; periode?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Body harus JSON" }, { status: 400 });
  }

  const nama = typeof body.nama === "string" ? body.nama.trim() : "";
  const tahun = typeof body.tahun === "number" ? body.tahun : Number(body.tahun);
  const periode = (body.periode === "I" || body.periode === "II") ? body.periode : "I";

  if (!nama || !Number.isInteger(tahun)) {
    return NextResponse.json(
      { message: "nama dan tahun (number) wajib" },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("ukt_tahun_ajaran")
    .insert({ nama, tahun, periode, is_active: true })
    .select("id, nama, tahun, periode, is_active, created_at")
    .single();

  if (error) {
    console.error("[ukt/tahun-ajaran POST]", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
