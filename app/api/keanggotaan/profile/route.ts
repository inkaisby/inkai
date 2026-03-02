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

export async function GET(req: NextRequest) {
  const rateLimitRes = checkApiRateLimit(req, "keanggotaan-profile", { max: 60, windowMs: 60_000 });
  if (rateLimitRes) return rateLimitRes;

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
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

  // Select minimal untuk hindari error jika kolom tidak ada
  const selectFields = "id, user_id, nama, avatar_path, ranting_id";

  // Cari profil: user_id ATAU id = auth.id (legacy)
  const { data: byUserId, error: errUser } = await admin
    .from("profiles")
    .select(selectFields)
    .eq("user_id", user.id)
    .maybeSingle();

  if (errUser && process.env.NODE_ENV === "development") {
    console.warn("[keanggotaan/profile] admin by user_id:", errUser.message);
  }
  if (!errUser && byUserId) {
    profile = byUserId;
  }

  if (!profile) {
    const { data: byId, error: errId } = await admin
      .from("profiles")
      .select(selectFields)
      .eq("id", user.id)
      .maybeSingle();

    if (errId && process.env.NODE_ENV === "development") {
      console.warn("[keanggotaan/profile] admin by id:", errId.message);
    }
    if (!errId && byId) profile = byId;
  }

  // Fallback: coba pakai session client (RLS) jika admin tidak ketemu
  if (!profile) {
    const sessionSupabase = await createSupabaseSessionClient();
    const { data: bySession } = await sessionSupabase
      .from("profiles")
      .select(selectFields)
      .eq("user_id", user.id)
      .maybeSingle();
    if (bySession) profile = bySession;
    if (!profile) {
      const { data: byIdSession } = await sessionSupabase
        .from("profiles")
        .select(selectFields)
        .eq("id", user.id)
        .maybeSingle();
      if (byIdSession) profile = byIdSession;
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
      .select(selectFields)
      .single();

    if (insertErr) {
      console.warn("[keanggotaan/profile] insert:", insertErr.code, insertErr.message);
    }
    if (!insertErr && inserted) {
      profile = inserted;
    } else if (insertErr?.code === "23505") {
      const { data: retry } = await admin
        .from("profiles")
        .select(selectFields)
        .eq("user_id", user.id)
        .maybeSingle();
      if (retry) profile = retry;
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
