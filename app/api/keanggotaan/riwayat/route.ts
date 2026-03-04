/**
 * GET /api/keanggotaan/riwayat
 * Mengambil riwayat KYU, DAN, Pelatihan untuk user yang login.
 * Memakai admin client agar konsisten dengan endpoint lain.
 * Mengembalikan fileUrl untuk setiap item yang punya file_path.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { checkApiRateLimit } from "@/app/lib/security/apiSecurity";
import { getPublicUrl } from "@/app/lib/storage/ijazah";

export async function GET(req: NextRequest) {
  const rateLimitRes = checkApiRateLimit(req, "keanggotaan-riwayat", { max: 60, windowMs: 60_000 });
  if (rateLimitRes) return rateLimitRes;

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();

  const { data: profile, error: profileError } = await admin
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
    admin
      .from("kyu")
      .select("id, level, no_ijazah, tanggal_ijazah, file_path")
      .eq("profile_id", profileId)
      .order("level", { ascending: false }),
    admin
      .from("dan")
      .select("id, dan, tanggal, msh_number, file_path")
      .eq("profile_id", profileId)
      .order("dan", { ascending: false }),
    admin
      .from("pelatihan")
      .select("id, nama, tanggal, kategori, file_path")
      .eq("profile_id", profileId)
      .order("tanggal", { ascending: false }),
  ]);

  const kyu = (kyuRes.data ?? []).map(
    (r: { id: string; level: number; no_ijazah?: string; tanggal_ijazah?: string; file_path?: string | null }) => ({
      id: String(r.id),
      level: Number(r.level),
      noIjazah: r.no_ijazah ?? undefined,
      tanggalIjazah: r.tanggal_ijazah ?? undefined,
      fileUrl: getPublicUrl(r.file_path ?? null) ?? undefined,
    }),
  );

  const dan = (danRes.data ?? []).map(
    (r: { id: string; dan: number; tanggal?: string; msh_number?: string; file_path?: string | null }) => ({
      id: String(r.id),
      dan: Number(r.dan),
      tanggal: r.tanggal ?? undefined,
      mshNumber: r.msh_number ?? undefined,
      fileUrl: getPublicUrl(r.file_path ?? null) ?? undefined,
    }),
  );

  const pelatihan = (pelatihanRes.data ?? []).map(
    (r: { id: string; nama?: string; tanggal?: string; kategori?: string; file_path?: string | null }) => ({
      id: String(r.id),
      nama: String(r.nama ?? ""),
      tanggal: String(r.tanggal ?? ""),
      kategori: String(r.kategori ?? "PELATIHAN"),
      fileUrl: getPublicUrl(r.file_path ?? null) ?? undefined,
    }),
  );

  return NextResponse.json({ kyu, dan, pelatihan });
}
