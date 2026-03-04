/**
 * GET /api/keanggotaan/pindah-ranting — list pengajuan pindah ranting user yang login.
 * POST /api/keanggotaan/pindah-ranting — buat pengajuan baru (body: asal, tujuan, alasan).
 * Memakai admin client agar tidak bergantung pada GRANT untuk role authenticated.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { checkApiRateLimit } from "@/app/lib/security/apiSecurity";

export async function GET(req: NextRequest) {
  const rateLimitRes = checkApiRateLimit(req, "keanggotaan-pindah", { max: 60, windowMs: 60_000 });
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

  const { data: rows, error } = await admin
    .from("pengajuan_pindah_ranting")
    .select("id, asal, tujuan, alasan, status, created_at")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { message: error.message || "Gagal mengambil riwayat pindah ranting" },
      { status: 500 },
    );
  }

  const riwayat = (rows ?? []).map((r) => ({
    id: String(r.id),
    asal: String(r.asal ?? ""),
    tujuan: String(r.tujuan ?? ""),
    alasan: r.alasan ?? undefined,
    tanggal: formatTanggalId(r.created_at),
    status: (r.status as "DIAJUKAN" | "DISETUJUI" | "DITOLAK") || "DIAJUKAN",
  }));

  return NextResponse.json({ riwayat });
}

export async function POST(req: NextRequest) {
  const rateLimitRes = checkApiRateLimit(req, "keanggotaan-pindah", { max: 30, windowMs: 60_000 });
  if (rateLimitRes) return rateLimitRes;

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: { asal?: string; tujuan?: string; alasan?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { message: "Body harus JSON dengan asal, tujuan, alasan" },
      { status: 400 },
    );
  }

  const asal = typeof body.asal === "string" ? body.asal.trim() : "";
  const tujuan = typeof body.tujuan === "string" ? body.tujuan.trim() : "";
  const alasan = typeof body.alasan === "string" ? body.alasan.trim() : null;

  if (!asal || !tujuan) {
    return NextResponse.json(
      { message: "asal dan tujuan wajib diisi" },
      { status: 400 },
    );
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

  const { data: inserted, error } = await admin
    .from("pengajuan_pindah_ranting")
    .insert({
      profile_id: profile.id,
      asal,
      tujuan,
      alasan,
      status: "DIAJUKAN",
    })
    .select("id, asal, tujuan, alasan, status, created_at")
    .single();

  if (error) {
    return NextResponse.json(
      { message: error.message || "Gagal menyimpan pengajuan" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    id: String(inserted.id),
    asal: inserted.asal,
    tujuan: inserted.tujuan,
    alasan: inserted.alasan ?? undefined,
    tanggal: formatTanggalId(inserted.created_at),
    status: inserted.status as "DIAJUKAN" | "DISETUJUI" | "DITOLAK",
  });
}

function formatTanggalId(createdAt: string | null): string {
  if (!createdAt) return "";
  try {
    const d = new Date(createdAt);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return String(createdAt);
  }
}
