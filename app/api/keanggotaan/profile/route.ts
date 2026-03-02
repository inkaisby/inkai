/**
 * GET /api/keanggotaan/profile
 * Profil anggota untuk kartu digital (termasuk avatar URL).
 * Memakai admin client agar avatar_path selalu terbaca.
 */
import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";

export async function GET() {
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
    ranting?: { id: string; nama?: string } | { id: string; nama?: string }[] | null;
  };
  let profile: ProfileRow | null = null;

  const selectFields = `
    id,
    user_id,
    nama,
    nomor,
    status,
    dan,
    avatar_path,
    ranting_id,
    ranting:ranting_id (id, nama)
  `;

  // Cari profil: user_id ATAU id = auth.id (legacy)
  const { data: byUserId, error: errUser } = await admin
    .from("profiles")
    .select(selectFields)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!errUser && byUserId) {
    profile = byUserId;
  }

  if (!profile) {
    const { data: byId, error: errId } = await admin
      .from("profiles")
      .select(selectFields)
      .eq("id", user.id)
      .maybeSingle();

    if (!errId && byId) profile = byId;
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

    if (!insertErr && inserted) {
      profile = inserted;
    } else if (insertErr?.code === "23505") {
      // Unique violation: profil mungkin baru dibuat oleh request lain, coba fetch lagi
      const { data: retry } = await admin
        .from("profiles")
        .select(selectFields)
        .eq("user_id", user.id)
        .maybeSingle();
      if (retry) profile = retry;
    }
  }

  if (!profile) {
    return NextResponse.json(
      { message: "Profile tidak ditemukan" },
      { status: 404 },
    );
  }

  // Ranting: dari join atau fallback fetch jika join kosong tapi ranting_id ada
  let rantingOne: { id: string; nama: string } | null = null;
  const rantingRaw = profile.ranting as
    | { id: string; nama?: string }
    | { id: string; nama?: string }[]
    | null;
  if (rantingRaw) {
    const r = Array.isArray(rantingRaw) ? rantingRaw[0] : rantingRaw;
    if (r?.id) {
      rantingOne = { id: String(r.id), nama: String(r.nama ?? "") };
    }
  }
  if ((!rantingOne || !rantingOne.nama) && profile.ranting_id) {
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
    nomor: profile.nomor ?? undefined,
    status: profile.status ?? undefined,
    dan: profile.dan ?? null,
    ranting: rantingOne
      ? { id: rantingOne.id, nama: rantingOne.nama }
      : { id: "-", nama: "-" },
    avatarUrl,
  });
}
