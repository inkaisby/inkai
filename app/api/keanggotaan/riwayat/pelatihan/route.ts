/**
 * POST /api/keanggotaan/riwayat/pelatihan — tambah riwayat pelatihan.
 * Body: JSON atau FormData (nama, tanggal?, kategori?, file?).
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { checkApiRateLimit } from "@/app/lib/security/apiSecurity";
import { uploadIjazah, getPublicUrl } from "@/app/lib/storage/ijazah";

export async function POST(req: NextRequest) {
  const rateLimitRes = checkApiRateLimit(req, "keanggotaan-riwayat", { max: 30, windowMs: 60_000 });
  if (rateLimitRes) return rateLimitRes;

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const contentType = req.headers.get("content-type") ?? "";
  let nama: string;
  let tanggal: string | null;
  let kategori: string;
  let file: File | null = null;

  if (contentType.includes("multipart/form-data")) {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ message: "FormData tidak valid" }, { status: 400 });
    }
    nama = (formData.get("nama") as string)?.trim() ?? "";
    if (!nama) return NextResponse.json({ message: "nama wajib diisi" }, { status: 400 });
    tanggal = (formData.get("tanggal") as string)?.trim() || null;
    kategori = (formData.get("kategori") as string)?.trim() || "PELATIHAN";
    const f = formData.get("file");
    if (f instanceof File && f.size > 0) file = f;
  } else {
    let body: { nama?: string; tanggal?: string; kategori?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ message: "Body harus JSON" }, { status: 400 });
    }
    nama = typeof body.nama === "string" ? body.nama.trim() : "";
    if (!nama) return NextResponse.json({ message: "nama wajib diisi" }, { status: 400 });
    tanggal = typeof body.tanggal === "string" ? body.tanggal.trim() || null : null;
    kategori = typeof body.kategori === "string" ? body.kategori.trim() || "PELATIHAN" : "PELATIHAN";
  }

  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin.from("profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (!profile?.id) return NextResponse.json({ message: "Profile tidak ditemukan" }, { status: 404 });

  const { data: row, error } = await admin
    .from("pelatihan")
    .insert({ profile_id: profile.id, nama, tanggal, kategori })
    .select("id, nama, tanggal, kategori, file_path")
    .single();

  if (error) return NextResponse.json({ message: error.message || "Gagal menyimpan pelatihan" }, { status: 500 });

  let filePath: string | null = null;
  if (file) {
    const up = await uploadIjazah(user.id, "pelatihan", String(row.id), file);
    if ("error" in up) return NextResponse.json({ message: up.error }, { status: 400 });
    filePath = up.path;
    await admin.from("pelatihan").update({ file_path: filePath }).eq("id", row.id);
  }

  const fileUrl = filePath ? getPublicUrl(filePath) : null;
  return NextResponse.json({
    id: String(row.id),
    nama: String(row.nama ?? ""),
    tanggal: String(row.tanggal ?? ""),
    kategori: String(row.kategori ?? "PELATIHAN"),
    fileUrl: fileUrl ?? undefined,
  });
}
