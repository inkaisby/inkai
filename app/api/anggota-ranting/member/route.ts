/**
 * GET /api/anggota-ranting/member?profile_id=xxx&ranting_id=yyy
 * Ambil satu anggota (profil + kyu/dan terakhir) untuk form edit.
 *
 * PATCH /api/anggota-ranting/member
 * Body: { profile_id, ranting_id, nama?, nik?, nomor?, status?, kyu_level?, dan? }
 * Update profil dan optional tambah riwayat Kyu/Dan.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getUserScope } from "@/app/lib/scope/getUserScope";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function canAccessRanting(scope: Awaited<ReturnType<typeof getUserScope>>, rantingId: string) {
  return scope.is_pp || (scope.ranting_ids.length > 0 && scope.ranting_ids.includes(rantingId));
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const profileId = req.nextUrl.searchParams.get("profile_id")?.trim();
  const rantingId = req.nextUrl.searchParams.get("ranting_id")?.trim();
  if (!profileId || !rantingId) {
    return NextResponse.json({ message: "profile_id dan ranting_id wajib" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const scope = await getUserScope(admin, user.id);
  if (!canAccessRanting(scope, rantingId)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { data: profile, error: pe } = await admin
    .from("profiles")
    .select("id, nama, nik, nomor, status, ranting_id")
    .eq("id", profileId)
    .eq("ranting_id", rantingId)
    .maybeSingle();
  if (pe || !profile) {
    return NextResponse.json({ message: "Profil tidak ditemukan" }, { status: 404 });
  }

  const [{ data: kyuRows }, { data: danRows }] = await Promise.all([
    admin.from("kyu").select("level").eq("profile_id", profileId).order("level", { ascending: false }).limit(1),
    admin.from("dan").select("dan").eq("profile_id", profileId).order("dan", { ascending: false }).limit(1),
  ]);
  const kyu_level = (kyuRows?.[0] as { level?: number } | undefined)?.level ?? 0;
  const dan = (danRows?.[0] as { dan?: number } | undefined)?.dan ?? 0;

  return NextResponse.json({
    profile_id: profile.id,
    nama: profile.nama ?? "",
    nik: profile.nik ?? "",
    nomor: profile.nomor ?? "",
    status: profile.status ?? "AKTIF",
    kyu_level,
    dan,
  });
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  let body: {
    profile_id?: string;
    ranting_id?: string;
    nama?: string;
    nik?: string | null;
    nomor?: string | null;
    status?: string;
    kyu_level?: number;
    dan?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Body harus JSON" }, { status: 400 });
  }

  const profileId = body.profile_id?.trim();
  const rantingId = body.ranting_id?.trim();
  if (!profileId || !rantingId) {
    return NextResponse.json({ message: "profile_id dan ranting_id wajib" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const scope = await getUserScope(admin, user.id);
  if (!canAccessRanting(scope, rantingId)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("id, ranting_id")
    .eq("id", profileId)
    .eq("ranting_id", rantingId)
    .maybeSingle();
  if (!profile) {
    return NextResponse.json({ message: "Profil tidak ditemukan" }, { status: 404 });
  }

  const profilePayload: { nama?: string; nik?: string | null; nomor?: string | null; status?: string | null; dan?: number | null } = {};
  if (typeof body.nama === "string") profilePayload.nama = body.nama.trim() || "";
  if (body.nik !== undefined) profilePayload.nik = body.nik === null || body.nik === "" ? null : String(body.nik).trim();
  if (body.nomor !== undefined) profilePayload.nomor = body.nomor === null || body.nomor === "" ? null : String(body.nomor).trim();

  /* Validasi duplikat: NIK dan No. Anggota tidak boleh dipakai profil lain */
  if (profilePayload.nik != null && profilePayload.nik !== "") {
    const { data: dupNik } = await admin
      .from("profiles")
      .select("id")
      .eq("nik", profilePayload.nik)
      .neq("id", profileId)
      .maybeSingle();
    if (dupNik) {
      return NextResponse.json(
        { message: "NIK sudah dipakai oleh anggota lain." },
        { status: 400 }
      );
    }
  }
  if (profilePayload.nomor != null && profilePayload.nomor !== "") {
    const { data: dupNomor } = await admin
      .from("profiles")
      .select("id")
      .eq("nomor", profilePayload.nomor)
      .neq("id", profileId)
      .maybeSingle();
    if (dupNomor) {
      return NextResponse.json(
        { message: "No. Anggota sudah dipakai oleh anggota lain." },
        { status: 400 }
      );
    }
  }

  if (body.status !== undefined) {
    const s = String(body.status).trim().toUpperCase().replace(/\s+/g, "");
    profilePayload.status = s === "NONAKTIF" ? "NONAKTIF" : "AKTIF";
  }
  if (typeof body.dan === "number" && body.dan >= 0 && body.dan <= 8) {
    profilePayload.dan = body.dan === 0 ? null : body.dan;
  }

  if (Object.keys(profilePayload).length > 0) {
    const { error: uErr } = await admin
      .from("profiles")
      .update(profilePayload)
      .eq("id", profileId);
    if (uErr) return NextResponse.json({ message: uErr.message || "Gagal update profil" }, { status: 500 });
  }

  const kyuLevel = typeof body.kyu_level === "number" ? body.kyu_level : null;
  if (kyuLevel !== null && kyuLevel >= 1 && kyuLevel <= 10) {
    const { data: maxKyu } = await admin.from("kyu").select("level").eq("profile_id", profileId).order("level", { ascending: false }).limit(1).maybeSingle();
    const currentKyu = (maxKyu as { level?: number } | null)?.level ?? 0;
    if (currentKyu !== kyuLevel) {
      const { error: kErr } = await admin.from("kyu").insert({ profile_id: profileId, level: kyuLevel });
      if (kErr) return NextResponse.json({ message: kErr.message || "Gagal menambah Kyu" }, { status: 500 });
    }
  }

  if (typeof body.dan === "number" && body.dan >= 1 && body.dan <= 8) {
    const { data: maxDan } = await admin.from("dan").select("dan").eq("profile_id", profileId).order("dan", { ascending: false }).limit(1).maybeSingle();
    const currentDan = (maxDan as { dan?: number } | null)?.dan ?? 0;
    if (currentDan !== body.dan) {
      const { error: dErr } = await admin.from("dan").insert({ profile_id: profileId, dan: body.dan });
      if (dErr) return NextResponse.json({ message: dErr.message || "Gagal menambah Dan" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
