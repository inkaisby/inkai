/**
 * PATCH /api/keanggotaan/riwayat/prestasi/[id] — ubah prestasi.
 * DELETE /api/keanggotaan/riwayat/prestasi/[id] — hapus prestasi.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { checkApiRateLimit } from "@/app/lib/security/apiSecurity";
import { uploadIjazah, getPublicUrl } from "@/app/lib/storage/ijazah";

const KATEGORI_VALID = ["OPEN", "FESTIVAL"] as const;
const TINGKAT_VALID = ["Nasional", "Provinsi", "Kota"] as const;

async function getProfileId(userId: string): Promise<string | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("profiles").select("id").eq("user_id", userId).maybeSingle();
  return data?.id ?? null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitRes = checkApiRateLimit(req, "keanggotaan-riwayat", { max: 30, windowMs: 60_000 });
  if (rateLimitRes) return rateLimitRes;

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const profileId = await getProfileId(user.id);
  if (!profileId) return NextResponse.json({ message: "Profile tidak ditemukan" }, { status: 404 });

  const contentType = req.headers.get("content-type") ?? "";
  const updates: {
    kategori?: string;
    nama_kejuaraan?: string;
    tahun?: string | null;
    tingkat?: string | null;
    kelas_pertandingan?: string | null;
    file_path?: string | null;
  } = {};
  let file: File | null = null;

  if (contentType.includes("multipart/form-data")) {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ message: "FormData tidak valid" }, { status: 400 });
    }
    const k = (formData.get("kategori") as string)?.trim();
    if (k && KATEGORI_VALID.includes(k as (typeof KATEGORI_VALID)[number])) updates.kategori = k;
    const n = (formData.get("nama_kejuaraan") as string)?.trim();
    if (n !== undefined && n) updates.nama_kejuaraan = n;
    const th = formData.get("tahun");
    if (th !== undefined) updates.tahun = (th as string)?.trim() || null;
    const tg = formData.get("tingkat");
    if (tg !== undefined) {
      const v = (tg as string)?.trim();
      updates.tingkat = v && TINGKAT_VALID.includes(v as (typeof TINGKAT_VALID)[number]) ? v : null;
    }
    const kp = formData.get("kelas_pertandingan");
    if (kp !== undefined) updates.kelas_pertandingan = (kp as string)?.trim() || null;
    const f = formData.get("file");
    if (f instanceof File && f.size > 0) file = f;
  } else {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ message: "Body harus JSON" }, { status: 400 });
    }
    if (typeof body.kategori === "string" && KATEGORI_VALID.includes(body.kategori.trim() as (typeof KATEGORI_VALID)[number])) {
      updates.kategori = body.kategori.trim();
    }
    if (typeof body.nama_kejuaraan === "string" && body.nama_kejuaraan.trim())
      updates.nama_kejuaraan = body.nama_kejuaraan.trim();
    if (typeof body.tahun === "string") updates.tahun = body.tahun.trim() || null;
    if (typeof body.tingkat === "string") {
      const v = body.tingkat.trim();
      updates.tingkat = v && TINGKAT_VALID.includes(v as (typeof TINGKAT_VALID)[number]) ? v : null;
    }
    if (typeof body.kelas_pertandingan === "string") updates.kelas_pertandingan = body.kelas_pertandingan.trim() || null;
  }

  const admin = createSupabaseAdminClient();
  if (file) {
    const up = await uploadIjazah(user.id, "prestasi", id, file);
    if ("error" in up) return NextResponse.json({ message: up.error }, { status: 400 });
    updates.file_path = up.path;
  }

  const { data: row, error } = await admin
    .from("prestasi")
    .update(updates)
    .eq("id", id)
    .eq("profile_id", profileId)
    .select("id, kategori, nama_kejuaraan, tahun, tingkat, kelas_pertandingan, file_path, verified_at, verified_by")
    .maybeSingle();

  if (error) return NextResponse.json({ message: error.message || "Gagal mengubah prestasi" }, { status: 500 });
  if (!row) return NextResponse.json({ message: "Prestasi tidak ditemukan" }, { status: 404 });

  const fileUrl = row.file_path ? getPublicUrl(row.file_path) : null;
  return NextResponse.json({
    id: String(row.id),
    kategori: row.kategori ?? "OPEN",
    namaKejuaraan: row.nama_kejuaraan ?? "",
    tahun: row.tahun ?? undefined,
    tingkat: row.tingkat ?? undefined,
    kelasPertandingan: row.kelas_pertandingan ?? undefined,
    fileUrl: fileUrl ?? undefined,
    verifiedAt: row.verified_at ?? undefined,
    verifiedBy: row.verified_by ?? undefined,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitRes = checkApiRateLimit(_req, "keanggotaan-riwayat", { max: 30, windowMs: 60_000 });
  if (rateLimitRes) return rateLimitRes;

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const profileId = await getProfileId(user.id);
  if (!profileId) return NextResponse.json({ message: "Profile tidak ditemukan" }, { status: 404 });

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("prestasi").delete().eq("id", id).eq("profile_id", profileId);

  if (error) return NextResponse.json({ message: error.message || "Gagal menghapus prestasi" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
