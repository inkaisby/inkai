/**
 * PATCH /api/keanggotaan/riwayat/kyu/[id] — ubah riwayat KYU.
 * Body: JSON atau FormData (level?, no_ijazah?, tanggal_ijazah?, file?).
 * DELETE /api/keanggotaan/riwayat/kyu/[id] — hapus riwayat KYU.
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
  const updates: { level?: number; no_ijazah?: string | null; tanggal_ijazah?: string | null; file_path?: string | null } = {};
  let file: File | null = null;

  if (contentType.includes("multipart/form-data")) {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ message: "FormData tidak valid" }, { status: 400 });
    }
    const levelVal = formData.get("level");
    if (levelVal != null) {
      const n = typeof levelVal === "number" ? levelVal : Number(levelVal);
      if (!Number.isNaN(n) && n >= 1 && n <= 10) updates.level = n;
    }
    const no = formData.get("no_ijazah");
    if (no !== undefined) updates.no_ijazah = (no as string)?.trim() || null;
    const tgl = formData.get("tanggal_ijazah");
    if (tgl !== undefined) updates.tanggal_ijazah = (tgl as string)?.trim() || null;
    const f = formData.get("file");
    if (f instanceof File && f.size > 0) file = f;
  } else {
    let body: { level?: number; no_ijazah?: string; tanggal_ijazah?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ message: "Body harus JSON" }, { status: 400 });
    }
    if (typeof body.level === "number" && body.level >= 1 && body.level <= 10) updates.level = body.level;
    if (typeof body.no_ijazah === "string") updates.no_ijazah = body.no_ijazah.trim() || null;
    if (typeof body.tanggal_ijazah === "string") updates.tanggal_ijazah = body.tanggal_ijazah.trim() || null;
  }

  const admin = createSupabaseAdminClient();
  if (file) {
    const up = await uploadIjazah(user.id, "kyu", id, file);
    if ("error" in up) return NextResponse.json({ message: up.error }, { status: 400 });
    updates.file_path = up.path;
  }

  const { data: row, error } = await admin
    .from("kyu")
    .update(updates)
    .eq("id", id)
    .eq("profile_id", profileId)
    .select("id, level, no_ijazah, tanggal_ijazah, file_path")
    .maybeSingle();

  if (error) return NextResponse.json({ message: error.message || "Gagal mengubah KYU" }, { status: 500 });
  if (!row) return NextResponse.json({ message: "KYU tidak ditemukan" }, { status: 404 });

  const fileUrl = row.file_path ? getPublicUrl(row.file_path) : null;
  return NextResponse.json({
    id: String(row.id),
    level: Number(row.level),
    noIjazah: row.no_ijazah ?? undefined,
    tanggalIjazah: row.tanggal_ijazah ?? undefined,
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
  const { error } = await admin.from("kyu").delete().eq("id", id).eq("profile_id", profileId);

  if (error) return NextResponse.json({ message: error.message || "Gagal menghapus KYU" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
