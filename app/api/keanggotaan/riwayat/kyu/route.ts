/**
 * POST /api/keanggotaan/riwayat/kyu — tambah riwayat KYU.
 * Body: JSON { level, no_ijazah?, tanggal_ijazah? } atau FormData (level, no_ijazah, tanggal_ijazah, file?).
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { checkApiRateLimit } from "@/app/lib/security/apiSecurity";
import { uploadIjazah, getPublicUrl } from "@/app/lib/storage/ijazah";

function parseLevel(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n) || n < 1 || n > 10) return null;
  return n;
}

export async function POST(req: NextRequest) {
  const rateLimitRes = checkApiRateLimit(req, "keanggotaan-riwayat", { max: 30, windowMs: 60_000 });
  if (rateLimitRes) return rateLimitRes;

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const contentType = req.headers.get("content-type") ?? "";
  let level: number;
  let no_ijazah: string | null;
  let tanggal_ijazah: string | null;
  let file: File | null = null;

  if (contentType.includes("multipart/form-data")) {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ message: "FormData tidak valid" }, { status: 400 });
    }
    const l = parseLevel(formData.get("level"));
    if (l === null) return NextResponse.json({ message: "level wajib 1–10" }, { status: 400 });
    level = l;
    no_ijazah = (formData.get("no_ijazah") as string)?.trim() || null;
    tanggal_ijazah = (formData.get("tanggal_ijazah") as string)?.trim() || null;
    const f = formData.get("file");
    if (f instanceof File && f.size > 0) file = f;
  } else {
    let body: { level?: number; no_ijazah?: string; tanggal_ijazah?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ message: "Body harus JSON" }, { status: 400 });
    }
    const l = parseLevel(body.level);
    if (l === null) return NextResponse.json({ message: "level wajib 1–10" }, { status: 400 });
    level = l;
    no_ijazah = typeof body.no_ijazah === "string" ? body.no_ijazah.trim() || null : null;
    tanggal_ijazah = typeof body.tanggal_ijazah === "string" ? body.tanggal_ijazah.trim() || null : null;
  }

  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin.from("profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (!profile?.id) return NextResponse.json({ message: "Profile tidak ditemukan" }, { status: 404 });

  const { data: row, error } = await admin
    .from("kyu")
    .insert({ profile_id: profile.id, level, no_ijazah, tanggal_ijazah })
    .select("id, level, no_ijazah, tanggal_ijazah, file_path")
    .single();

  if (error) return NextResponse.json({ message: error.message || "Gagal menyimpan KYU" }, { status: 500 });

  let filePath: string | null = null;
  if (file) {
    const up = await uploadIjazah(user.id, "kyu", String(row.id), file);
    if ("error" in up) return NextResponse.json({ message: up.error }, { status: 400 });
    filePath = up.path;
    await admin.from("kyu").update({ file_path: filePath }).eq("id", row.id);
  }

  const fileUrl = filePath ? getPublicUrl(filePath) : null;
  return NextResponse.json({
    id: String(row.id),
    level: Number(row.level),
    noIjazah: row.no_ijazah ?? undefined,
    tanggalIjazah: row.tanggal_ijazah ?? undefined,
    fileUrl: fileUrl ?? undefined,
  });
}
