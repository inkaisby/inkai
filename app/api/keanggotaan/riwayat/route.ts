/**
 * GET /api/keanggotaan/riwayat
 * Mengambil riwayat KYU, DAN, Pelatihan, Prestasi untuk user yang login.
 * Query opsional: profile_id — bila ada dan user punya akses ranting (Ketua Ranting/dll.), kembalikan riwayat anggota tersebut.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { checkApiRateLimit } from "@/app/lib/security/apiSecurity";
import { getPublicUrl } from "@/app/lib/storage/ijazah";
import { getUserScope } from "@/app/lib/scope/getUserScope";

export async function GET(req: NextRequest) {
  const rateLimitRes = checkApiRateLimit(req, "keanggotaan-riwayat", { max: 60, windowMs: 60_000 });
  if (rateLimitRes) return rateLimitRes;

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const queryProfileId = req.nextUrl.searchParams.get("profile_id")?.trim() || null;

  let profileId: string;

  if (queryProfileId) {
    const { data: targetProfile } = await admin
      .from("profiles")
      .select("id, ranting_id")
      .eq("id", queryProfileId)
      .maybeSingle();
    if (!targetProfile?.id) {
      return NextResponse.json({ message: "Profil tidak ditemukan" }, { status: 404 });
    }
    const rantingId = targetProfile.ranting_id ? String(targetProfile.ranting_id).trim() : null;
    if (!rantingId) {
      return NextResponse.json({ message: "Profil anggota belum memiliki ranting" }, { status: 400 });
    }
    const scope = await getUserScope(admin, user.id);
    const canAccess = scope.is_pp || (scope.ranting_ids.length > 0 && scope.ranting_ids.includes(rantingId));
    if (!canAccess) {
      return NextResponse.json({ message: "Tidak punya akses ke ranting anggota ini" }, { status: 403 });
    }
    profileId = String(targetProfile.id);
  } else {
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
    profileId = String(profile.id);
  }

  const [kyuRes, danRes, pelatihanRes, prestasiRes, uktHasilRes] = await Promise.all([
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
    admin
      .from("prestasi")
      .select("id, kategori, nama_kejuaraan, tahun, tingkat, kelas_pertandingan, file_path, verified_at, verified_by")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false }),
    admin
      .from("ukt_pendaftaran")
      .select("id, tingkat_lulus, created_at")
      .eq("profile_id", profileId)
      .eq("lulus", true)
      .not("tingkat_lulus", "is", null)
      .order("created_at", { ascending: false }),
  ]);

  const kyuManual = (kyuRes.data ?? []).map(
    (r: { id: string; level: number; no_ijazah?: string; tanggal_ijazah?: string; file_path?: string | null }) => ({
      id: String(r.id),
      level: Number(r.level),
      noIjazah: r.no_ijazah ?? undefined,
      tanggalIjazah: r.tanggal_ijazah ?? undefined,
      fileUrl: getPublicUrl(r.file_path ?? null) ?? undefined,
      fromUkt: false,
    }),
  );

  const manualLevels = new Set(kyuManual.map((k: { level: number }) => k.level));
  const addedLevels = new Set<number>();
  const kyuFromUkt: { id: string; level: number; noIjazah?: string; tanggalIjazah?: string; fileUrl?: string; fromUkt: true }[] = [];
  for (const r of uktHasilRes.data ?? []) {
    const level = Number((r as { tingkat_lulus?: number | null }).tingkat_lulus);
    if (level < 1 || level > 10 || manualLevels.has(level) || addedLevels.has(level)) continue;
    addedLevels.add(level);
    const row = r as { id: string; created_at?: string };
    const d = row.created_at ? new Date(row.created_at) : null;
    const tanggalIjazah = d ? d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : undefined;
    kyuFromUkt.push({
      id: `ukt-${row.id}`,
      level,
      tanggalIjazah,
      fromUkt: true,
    });
  }
  const kyuFromUktSorted = kyuFromUkt.sort((a, b) => b.level - a.level);
  const kyu = [...kyuManual, ...kyuFromUktSorted].sort((a, b) => b.level - a.level);

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

  const prestasi = (prestasiRes.data ?? []).map(
    (r: {
      id: string;
      kategori?: string;
      nama_kejuaraan?: string;
      tahun?: string;
      tingkat?: string;
      kelas_pertandingan?: string;
      file_path?: string | null;
      verified_at?: string | null;
      verified_by?: string | null;
    }) => ({
      id: String(r.id),
      kategori: String(r.kategori ?? "OPEN"),
      namaKejuaraan: String(r.nama_kejuaraan ?? ""),
      tahun: String(r.tahun ?? ""),
      tingkat: String(r.tingkat ?? ""),
      kelasPertandingan: String(r.kelas_pertandingan ?? ""),
      fileUrl: getPublicUrl(r.file_path ?? null) ?? undefined,
      verifiedAt: r.verified_at ?? undefined,
      verifiedBy: r.verified_by ?? undefined,
    }),
  );

  return NextResponse.json({ kyu, dan, pelatihan, prestasi });
}
