/**
 * GET /api/keanggotaan/profile
 * Profil anggota untuk kartu digital (termasuk avatar URL).
 * Memakai admin client agar avatar_path selalu terbaca.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, createSupabaseSessionClient } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { checkApiRateLimit } from "@/app/lib/security/apiSecurity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const rateLimitRes = checkApiRateLimit(req, "keanggotaan-profile", { max: 60, windowMs: 60_000 });
  if (rateLimitRes) return rateLimitRes;

  const user = await getSessionUser();
  if (!user) {
    const body: { message: string; hint?: string } = { message: "Unauthorized" };
    if (process.env.VERCEL) {
      body.hint =
        "Session tidak terbaca. Pastikan: 1) Sudah login di domain ini, 2) Supabase Dashboard > Auth > URL Configuration: Site URL dan Redirect URLs mencakup domain Vercel.";
    }
    return NextResponse.json(body, { status: 401 });
  }

  const admin = createSupabaseAdminClient();

  // Cari profil: dulu by user_id, fallback by id (legacy: id = auth.id)
  type ProfileRow = {
    id: string;
    user_id?: string | null;
    nama?: string | null;
    nomor?: string | null;
    status?: string | null;
    dan?: number | null;
    avatar_path?: string | null;
    ranting_id?: string | null;
  };
  let profile: ProfileRow | null = null;

  // Select minimal dulu agar foto (avatar_path) dan ranting (ranting_id) selalu terbaca
  // meskipun kolom nomor/status/dan belum ada (migration 20250228200000 belum dijalankan)
  const selectMinimal = "id, user_id, nama, avatar_path, ranting_id";

  const runSelect = (fields: string) =>
    admin.from("profiles").select(fields).eq("user_id", user.id).maybeSingle();

  let errUser: { message?: string } | null = null;
  let byUserId: ProfileRow | null = null;
  const resUser = await runSelect(selectMinimal);
  errUser = resUser.error ?? null;
  byUserId = resUser.data as ProfileRow | null;

  if (!errUser && byUserId) {
    profile = byUserId;
  }

  if (!profile) {
    const resId = await admin
      .from("profiles")
      .select(selectMinimal)
      .eq("id", user.id)
      .maybeSingle();
    if (!resId.error && resId.data) profile = resId.data as ProfileRow;
  }

  // Fallback: session client (RLS)
  if (!profile) {
    const sessionSupabase = await createSupabaseSessionClient();
    const { data: bySession } = await sessionSupabase
      .from("profiles")
      .select(selectMinimal)
      .eq("user_id", user.id)
      .maybeSingle();
    if (bySession) profile = bySession as ProfileRow;
    if (!profile) {
      const { data: byIdSession } = await sessionSupabase
        .from("profiles")
        .select(selectMinimal)
        .eq("id", user.id)
        .maybeSingle();
      if (byIdSession) profile = byIdSession as ProfileRow;
    }
  }

  // Jika ada profil, coba ambil nomor/status/dan (kolom opsional dari migration)
  if (profile) {
    const extraRes = await admin
      .from("profiles")
      .select("nomor, status, dan")
      .eq("id", profile.id)
      .maybeSingle();
    if (!extraRes.error && extraRes.data) {
      const e = extraRes.data as { nomor?: string | null; status?: string | null; dan?: number | null };
      profile = { ...profile, nomor: e.nomor, status: e.status, dan: e.dan };
    }
  }

  // Fallback: buat profil minimal jika belum ada (sama seperti /api/me)
  if (!profile) {
    const { data: inserted, error: insertErr } = await admin
      .from("profiles")
      .insert({
        id: crypto.randomUUID(),
        user_id: user.id,
        email: user.email ?? "",
        nama: user.email ?? "Pengguna",
        app_role: "USER",
        email_allowed: true,
      })
      .select(selectMinimal)
      .single();

    if (insertErr) {
      console.warn("[keanggotaan/profile] insert:", insertErr.code, insertErr.message);
    }
    if (!insertErr && inserted) {
      profile = inserted as ProfileRow;
    } else if (insertErr?.code === "23505") {
      const { data: retry } = await admin
        .from("profiles")
        .select(selectMinimal)
        .eq("user_id", user.id)
        .maybeSingle();
      if (retry) profile = retry as ProfileRow;
    }
  }

  if (!profile) {
    const body: { message: string; debug?: string } = { message: "Profile tidak ditemukan" };
    if (process.env.NODE_ENV === "development") {
      const { data: rawCheck, error: rawErr } = await admin
        .from("profiles")
        .select("id, user_id, nama")
        .eq("user_id", user.id)
        .maybeSingle();
      body.debug = `user_id: ${user.id}. rawErr: ${rawErr?.message ?? "null"}. rawCheck: ${rawCheck ? "FOUND" : "null"}`;
    }
    return NextResponse.json(body, { status: 404 });
  }

  // Ranting: fetch dari tabel ranting
  let rantingOne: { id: string; nama: string } | null = null;
  if (profile.ranting_id) {
    const { data: r } = await admin
      .from("ranting")
      .select("id, nama")
      .eq("id", profile.ranting_id)
      .maybeSingle();
    if (r) rantingOne = { id: String(r.id), nama: String(r.nama ?? "") };
  }

  let avatarUrl: string | null = null;
  if (profile.avatar_path) {
    const { data } = admin.storage
      .from("avatars_v2")
      .getPublicUrl(profile.avatar_path);
    avatarUrl = data?.publicUrl ?? null;
  }

  return NextResponse.json({
    id: profile.id,
    user_id: profile.user_id,
    nama: profile.nama ?? "",
    nomor: (profile as { nomor?: string | null }).nomor ?? undefined,
    status: (profile as { status?: string | null }).status ?? undefined,
    dan: (profile as { dan?: number | null }).dan ?? null,
    ranting: rantingOne
      ? { id: rantingOne.id, nama: rantingOne.nama }
      : { id: "-", nama: "-" },
    avatarUrl,
  });
}

/**
 * PATCH /api/keanggotaan/profile
 * Update nomor anggota & status keanggotaan (profil user yang login).
 * Body: { nomor?: string, status?: string }
 * Hanya SUPERADMIN yang boleh mengubah nomor; user biasa hanya boleh status.
 */
export async function PATCH(req: NextRequest) {
  const rateLimitRes = checkApiRateLimit(req, "keanggotaan-profile", {
    max: 30,
    windowMs: 60_000,
  });
  if (rateLimitRes) return rateLimitRes;

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: { nomor?: string; status?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { message: "Body harus JSON" },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdminClient();

  const { data: profileRow } = await admin
    .from("profiles")
    .select("id, app_role")
    .eq("user_id", user.id)
    .maybeSingle();
  const currentProfile = profileRow
    ?? (await admin.from("profiles").select("id, app_role").eq("id", user.id).maybeSingle()).data;
  const isSuperadmin =
    (currentProfile?.app_role ?? "").toUpperCase() === "SUPERADMIN";

  const payload: { nomor?: string | null; status?: string | null } = {};
  if (typeof body.status === "string") payload.status = body.status.trim() || null;
  if (typeof body.nomor === "string") {
    if (isSuperadmin) {
      payload.nomor = body.nomor.trim() || null;
    }
  }
  if (Object.keys(payload).length === 0) {
    return NextResponse.json(
      { message: "Tidak ada nomor atau status yang diubah" },
      { status: 400 }
    );
  }

  const profileId = currentProfile?.id ?? null;
  if (!profileId) {
    return NextResponse.json(
      { message: "Profil tidak ditemukan" },
      { status: 404 }
    );
  }

  const { data, error } = await admin
    .from("profiles")
    .update(payload)
    .eq("id", profileId)
    .select("id, nomor, status")
    .single();

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[keanggotaan/profile] PATCH:", error.message);
    }
    return NextResponse.json(
      { message: error.message ?? "Gagal memperbarui profil" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    nomor: (data as { nomor?: string | null }).nomor ?? null,
    status: (data as { status?: string | null }).status ?? null,
  });
}
