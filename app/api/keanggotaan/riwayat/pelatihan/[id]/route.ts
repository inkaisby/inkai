/**
 * PATCH /api/keanggotaan/riwayat/pelatihan/[id] — ubah riwayat pelatihan.
 * Body: JSON atau FormData (nama?, tanggal?, kategori?, file?).
 * DELETE /api/keanggotaan/riwayat/pelatihan/[id] — hapus riwayat pelatihan.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { checkApiRateLimit } from "@/app/lib/security/apiSecurity";
import { uploadIjazah, getPublicUrl } from "@/app/lib/storage/ijazah";

async function getProfileId(userId: string) {
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
  const updates: { nama?: string; tanggal?: string | null; kategori?: string; file_path?: string | null } = {};
  let file: File | null = null;

  if (contentType.includes("multipart/form-data")) {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ message: "FormData tidak valid" }, { status: 400 });
    }
    const nm = formData.get("nama");
    if (nm !== undefined && (nm as string)?.trim()) updates.nama = (nm as string).trim();
    const tgl = formData.get("tanggal");
    if (tgl !== undefined) updates.tanggal = (tgl as string)?.trim() || null;
    const kat = formData.get("kategori");
    if (kat !== undefined) updates.kategori = (kat as string)?.trim() || "PELATIHAN";
    const f = formData.get("file");
    if (f instanceof File && f.size > 0) file = f;
  } else {
    let body: { nama?: string; tanggal?: string; kategori?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ message: "Body harus JSON" }, { status: 400 });
    }
    if (typeof body.nama === "string" && body.nama.trim()) updates.nama = body.nama.trim();
    if (typeof body.tanggal === "string") updates.tanggal = body.tanggal.trim() || null;
    if (typeof body.kategori === "string") updates.kategori = body.kategori.trim() || "PELATIHAN";
  }

  const admin = createSupabaseAdminClient();
  if (file) {
    const up = await uploadIjazah(user.id, "pelatihan", id, file);
    if ("error" in up) return NextResponse.json({ message: up.error }, { status: 400 });
    updates.file_path = up.path;
  }

  const { data: row, error } = await admin
    .from("pelatihan")
    .update(updates)
    .eq("id", id)
    .eq("profile_id", profileId)
    .select("id, nama, tanggal, kategori, file_path")
    .maybeSingle();

  if (error) return NextResponse.json({ message: error.message || "Gagal mengubah pelatihan" }, { status: 500 });
  if (!row) return NextResponse.json({ message: "Pelatihan tidak ditemukan" }, { status: 404 });

  const fileUrl = row.file_path ? getPublicUrl(row.file_path) : null;
  return NextResponse.json({
    id: String(row.id),
    nama: String(row.nama ?? ""),
    tanggal: String(row.tanggal ?? ""),
    kategori: String(row.kategori ?? "PELATIHAN"),
    fileUrl: fileUrl ?? undefined,
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
  const { error } = await admin.from("pelatihan").delete().eq("id", id).eq("profile_id", profileId);

  if (error) return NextResponse.json({ message: error.message || "Gagal menghapus pelatihan" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
