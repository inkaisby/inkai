/**
 * GET /api/keanggotaan/riwayat
 * Mengambil riwayat KYU, DAN, Pelatihan untuk user yang login.
 * Versi ini memakai client session + RLS, bukan service role.
 *
 * SYARAT di Supabase (disarankan):
 * - Tabel `profiles` punya RLS policy yang mengizinkan user melihat profil miliknya sendiri.
 * - Tabel `kyu`, `dan`, `pelatihan` punya RLS policy yang hanya mengizinkan akses baris
 *   dengan `profile_id` yang terkait ke profil user yang login.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, createSupabaseSessionClient } from "@/app/lib/supabase/session";
import { checkApiRateLimit } from "@/app/lib/security/apiSecurity";

export async function GET(req: NextRequest) {
  const rateLimitRes = checkApiRateLimit(req, "keanggotaan-riwayat", { max: 60, windowMs: 60_000 });
  if (rateLimitRes) return rateLimitRes;

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createSupabaseSessionClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError || !profile?.id) {
    return NextResponse.json(
      { message: "Profile tidak ditemukan" },
      { status: 404 },
    );
  }

  const profileId = String(profile.id);

  const [kyuRes, danRes, pelatihanRes] = await Promise.all([
    supabase
      .from("kyu")
      .select("id, level, no_ijazah, tanggal_ijazah")
      .eq("profile_id", profileId)
      .order("level", { ascending: false }),
    supabase
      .from("dan")
      .select("dan, tanggal, msh_number")
      .eq("profile_id", profileId)
      .order("dan", { ascending: false }),
    supabase
      .from("pelatihan")
      .select("id, nama, tanggal, kategori")
      .eq("profile_id", profileId)
      .order("tanggal", { ascending: false }),
  ]);

  const kyu = (kyuRes.data ?? []).map(
    (r: { id: string; level: number; no_ijazah?: string; tanggal_ijazah?: string }) => ({
      id: String(r.id),
      level: Number(r.level),
      noIjazah: r.no_ijazah ?? undefined,
      tanggalIjazah: r.tanggal_ijazah ?? undefined,
    }),
  );

  const dan = (danRes.data ?? []).map(
    (r: { dan: number; tanggal?: string; msh_number?: string }) => ({
      dan: Number(r.dan),
      tanggal: r.tanggal ?? undefined,
      mshNumber: r.msh_number ?? undefined,
    }),
  );

  const pelatihan = (pelatihanRes.data ?? []).map(
    (r: { id: string; nama?: string; tanggal?: string; kategori?: string }) => ({
      id: String(r.id),
      nama: String(r.nama ?? ""),
      tanggal: String(r.tanggal ?? ""),
      kategori: String(r.kategori ?? "PELATIHAN"),
    }),
  );

  return NextResponse.json({ kyu, dan, pelatihan });
}
