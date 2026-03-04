/**
 * PATCH /api/keanggotaan/riwayat/dan/[id] — ubah riwayat DAN.
 * Body: JSON atau FormData (dan?, tanggal?, msh_number?, file?).
 * DELETE /api/keanggotaan/riwayat/dan/[id] — hapus riwayat DAN.
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
  const updates: { dan?: number; tanggal?: string | null; msh_number?: string | null; file_path?: string | null } = {};
  let file: File | null = null;

  if (contentType.includes("multipart/form-data")) {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ message: "FormData tidak valid" }, { status: 400 });
    }
    const danVal = formData.get("dan");
    if (danVal != null) {
      const n = typeof danVal === "number" ? danVal : Number(danVal);
      if (!Number.isNaN(n) && n >= 1 && n <= 8) updates.dan = n;
    }
    const tgl = formData.get("tanggal");
    if (tgl !== undefined) updates.tanggal = (tgl as string)?.trim() || null;
    const msh = formData.get("msh_number");
    if (msh !== undefined) updates.msh_number = (msh as string)?.trim() || null;
    const f = formData.get("file");
    if (f instanceof File && f.size > 0) file = f;
  } else {
    let body: { dan?: number; tanggal?: string; msh_number?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ message: "Body harus JSON" }, { status: 400 });
    }
    if (typeof body.dan === "number" && body.dan >= 1 && body.dan <= 8) updates.dan = body.dan;
    if (typeof body.tanggal === "string") updates.tanggal = body.tanggal.trim() || null;
    if (typeof body.msh_number === "string") updates.msh_number = body.msh_number.trim() || null;
  }

  const admin = createSupabaseAdminClient();
  if (file) {
    const up = await uploadIjazah(user.id, "dan", id, file);
    if ("error" in up) return NextResponse.json({ message: up.error }, { status: 400 });
    updates.file_path = up.path;
  }

  const { data: row, error } = await admin
    .from("dan")
    .update(updates)
    .eq("id", id)
    .eq("profile_id", profileId)
    .select("id, dan, tanggal, msh_number, file_path")
    .maybeSingle();

  if (error) return NextResponse.json({ message: error.message || "Gagal mengubah DAN" }, { status: 500 });
  if (!row) return NextResponse.json({ message: "DAN tidak ditemukan" }, { status: 404 });

  const fileUrl = row.file_path ? getPublicUrl(row.file_path) : null;
  return NextResponse.json({
    id: String(row.id),
    dan: Number(row.dan),
    tanggal: row.tanggal ?? undefined,
    mshNumber: row.msh_number ?? undefined,
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
  const { error } = await admin.from("dan").delete().eq("id", id).eq("profile_id", profileId);

  if (error) return NextResponse.json({ message: error.message || "Gagal menghapus DAN" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
