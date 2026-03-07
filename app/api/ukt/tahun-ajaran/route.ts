/**
 * GET: Daftar tahun ajaran UKT (untuk dropdown). Filter: global (cabang_id null) + UKT cabang user.
 * POST: Tambah UKT. Superadmin: global atau per cabang. Cabang: hanya untuk cabang sendiri (wajib tanggal & tempat).
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getUserScope } from "@/app/lib/scope/getUserScope";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const scope = await getUserScope(admin, user.id);

  let data: unknown[] = [];
  if (scope.is_pp) {
    const res = await admin
      .from("ukt_tahun_ajaran")
      .select("id, nama, tahun, periode, is_active, created_at, cabang_id, tanggal, tempat, ditutup_at, biaya_per_kyu")
      .order("tahun", { ascending: false })
      .order("periode", { ascending: false });
    if (res.error) {
      console.error("[ukt/tahun-ajaran GET]", res.error);
      return NextResponse.json({ message: res.error.message }, { status: 500 });
    }
    data = res.data ?? [];
  } else {
    const [globalRes, cabangRes] = await Promise.all([
      admin
        .from("ukt_tahun_ajaran")
        .select("id, nama, tahun, periode, is_active, created_at, cabang_id, tanggal, tempat, ditutup_at, biaya_per_kyu")
        .is("cabang_id", null)
        .order("tahun", { ascending: false })
        .order("periode", { ascending: false }),
      scope.cabang_ids.length > 0
        ? admin
            .from("ukt_tahun_ajaran")
            .select("id, nama, tahun, periode, is_active, created_at, cabang_id, tanggal, tempat, ditutup_at, biaya_per_kyu")
            .in("cabang_id", scope.cabang_ids)
            .order("tahun", { ascending: false })
            .order("periode", { ascending: false })
        : { data: [] as unknown[], error: null },
    ]);
    if (globalRes.error) {
      console.error("[ukt/tahun-ajaran GET]", globalRes.error);
      return NextResponse.json({ message: globalRes.error.message }, { status: 500 });
    }
    if (cabangRes.error) {
      console.error("[ukt/tahun-ajaran GET]", cabangRes.error);
      return NextResponse.json({ message: (cabangRes as { error: { message: string } }).error.message }, { status: 500 });
    }
    const byId = new Map((globalRes.data ?? []).map((r: { id: string }) => [r.id, r]));
    (cabangRes.data ?? []).forEach((r: { id: string }) => byId.set(r.id, r));
    data = Array.from(byId.values()).sort((a: { tahun?: number; periode?: string }, b: { tahun?: number; periode?: string }) => {
      if ((b.tahun ?? 0) !== (a.tahun ?? 0)) return (b.tahun ?? 0) - (a.tahun ?? 0);
      return (b.periode === "II" ? 1 : 0) - (a.periode === "II" ? 1 : 0);
    });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: {
    nama?: string;
    tahun?: number;
    periode?: string;
    cabang_id?: string | null;
    tanggal?: string | null;
    tempat?: string | null;
    biaya_per_kyu?: Record<string, number> | null;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Body harus JSON" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const scope = await getUserScope(admin, user.id);

  const nama = typeof body.nama === "string" ? body.nama.trim() : "";
  const tahun = typeof body.tahun === "number" ? body.tahun : Number(body.tahun);
  const periode = (body.periode === "I" || body.periode === "II") ? body.periode : "I";
  const cabangId = body.cabang_id != null && body.cabang_id !== "" ? String(body.cabang_id).trim() : null;
  const tanggal = body.tanggal != null && body.tanggal !== "" ? String(body.tanggal).trim() : null;
  const tempat = body.tempat != null && body.tempat !== "" ? String(body.tempat).trim() : null;
  const biayaPerKyu = body.biaya_per_kyu != null && typeof body.biaya_per_kyu === "object" ? body.biaya_per_kyu : null;

  if (!nama || !Number.isInteger(tahun)) {
    return NextResponse.json(
      { message: "nama dan tahun (number) wajib" },
      { status: 400 }
    );
  }

  if (!scope.is_pp && scope.cabang_ids.length === 0) {
    return NextResponse.json(
      { message: "Hanya PP/Superadmin atau Ketua Cabang yang dapat membuat UKT" },
      { status: 403 }
    );
  }

  if (scope.cabang_ids.length > 0 && !scope.is_pp) {
    if (!cabangId || !scope.cabang_ids.includes(cabangId)) {
      return NextResponse.json(
        { message: "Cabang hanya dapat membuat UKT untuk cabang sendiri" },
        { status: 403 }
      );
    }
    if (!tanggal || !tempat) {
      return NextResponse.json(
        { message: "tanggal dan tempat wajib untuk UKT per cabang" },
        { status: 400 }
      );
    }
  }

  const insert: Record<string, unknown> = {
    nama,
    tahun,
    periode,
    is_active: true,
  };
  if (cabangId) insert.cabang_id = cabangId;
  if (tanggal) insert.tanggal = tanggal;
  if (tempat) insert.tempat = tempat;
  if (biayaPerKyu && Object.keys(biayaPerKyu).length > 0) insert.biaya_per_kyu = biayaPerKyu;

  const { data, error } = await admin
    .from("ukt_tahun_ajaran")
    .insert(insert)
    .select("id, nama, tahun, periode, is_active, created_at, cabang_id, tanggal, tempat, ditutup_at, biaya_per_kyu")
    .single();

  if (error) {
    console.error("[ukt/tahun-ajaran POST]", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
