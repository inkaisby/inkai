/**
 * POST /api/keanggotaan/riwayat/dan — tambah riwayat DAN.
 * Body: JSON atau FormData (dan, tanggal?, msh_number?, file?).
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { checkApiRateLimit } from "@/app/lib/security/apiSecurity";
import { uploadIjazah, getPublicUrl } from "@/app/lib/storage/ijazah";

function parseDan(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n) || n < 1 || n > 8) return null;
  return n;
}

export async function POST(req: NextRequest) {
  const rateLimitRes = checkApiRateLimit(req, "keanggotaan-riwayat", { max: 30, windowMs: 60_000 });
  if (rateLimitRes) return rateLimitRes;

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const contentType = req.headers.get("content-type") ?? "";
  let dan: number;
  let tanggal: string | null;
  let msh_number: string | null;
  let file: File | null = null;

  if (contentType.includes("multipart/form-data")) {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ message: "FormData tidak valid" }, { status: 400 });
    }
    const d = parseDan(formData.get("dan"));
    if (d === null) return NextResponse.json({ message: "dan wajib 1–8" }, { status: 400 });
    dan = d;
    tanggal = (formData.get("tanggal") as string)?.trim() || null;
    msh_number = (formData.get("msh_number") as string)?.trim() || null;
    const f = formData.get("file");
    if (f instanceof File && f.size > 0) file = f;
  } else {
    let body: { dan?: number; tanggal?: string; msh_number?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ message: "Body harus JSON" }, { status: 400 });
    }
    const d = parseDan(body.dan);
    if (d === null) return NextResponse.json({ message: "dan wajib 1–8" }, { status: 400 });
    dan = d;
    tanggal = typeof body.tanggal === "string" ? body.tanggal.trim() || null : null;
    msh_number = typeof body.msh_number === "string" ? body.msh_number.trim() || null : null;
  }

  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin.from("profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (!profile?.id) return NextResponse.json({ message: "Profile tidak ditemukan" }, { status: 404 });

  const { data: row, error } = await admin
    .from("dan")
    .insert({ profile_id: profile.id, dan, tanggal, msh_number })
    .select("id, dan, tanggal, msh_number, file_path")
    .single();

  if (error) return NextResponse.json({ message: error.message || "Gagal menyimpan DAN" }, { status: 500 });

  let filePath: string | null = null;
  if (file) {
    const up = await uploadIjazah(user.id, "dan", String(row.id), file);
    if ("error" in up) return NextResponse.json({ message: up.error }, { status: 400 });
    filePath = up.path;
    await admin.from("dan").update({ file_path: filePath }).eq("id", row.id);
  }

  const fileUrl = filePath ? getPublicUrl(filePath) : null;
  return NextResponse.json({
    id: String(row.id),
    dan: Number(row.dan),
    tanggal: row.tanggal ?? undefined,
    mshNumber: row.msh_number ?? undefined,
    fileUrl: fileUrl ?? undefined,
  });
}
