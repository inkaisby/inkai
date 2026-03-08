/**
 * POST /api/keanggotaan/riwayat/prestasi — tambah prestasi (riwayat pertandingan).
 * Body: JSON atau FormData (kategori, nama_kejuaraan, tahun?, tingkat?, kelas_pertandingan?, file?).
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { checkApiRateLimit } from "@/app/lib/security/apiSecurity";
import { uploadIjazah, getPublicUrl } from "@/app/lib/storage/ijazah";

const KATEGORI_VALID = ["OPEN", "FESTIVAL"] as const;
const TINGKAT_VALID = ["Nasional", "Provinsi", "Kota"] as const;

function parseBody(
  contentType: string,
  formData: FormData | null,
  bodyJson: Record<string, unknown> | null
): {
  kategori: string;
  namaKejuaraan: string;
  tahun: string | null;
  tingkat: string | null;
  kelasPertandingan: string | null;
  file: File | null;
} {
  let kategori = "OPEN";
  let namaKejuaraan = "";
  let tahun: string | null = null;
  let tingkat: string | null = null;
  let kelasPertandingan: string | null = null;
  let file: File | null = null;

  if (contentType.includes("multipart/form-data") && formData) {
    kategori = (formData.get("kategori") as string)?.trim() || "OPEN";
    if (!KATEGORI_VALID.includes(kategori as (typeof KATEGORI_VALID)[number])) kategori = "OPEN";
    namaKejuaraan = (formData.get("nama_kejuaraan") as string)?.trim() ?? "";
    tahun = (formData.get("tahun") as string)?.trim() || null;
    tingkat = (formData.get("tingkat") as string)?.trim() || null;
    if (tingkat && !TINGKAT_VALID.includes(tingkat as (typeof TINGKAT_VALID)[number])) tingkat = null;
    kelasPertandingan = (formData.get("kelas_pertandingan") as string)?.trim() || null;
    const f = formData.get("file");
    if (f instanceof File && f.size > 0) file = f;
  } else if (bodyJson) {
    kategori = typeof bodyJson.kategori === "string" ? bodyJson.kategori.trim() || "OPEN" : "OPEN";
    if (!KATEGORI_VALID.includes(kategori as (typeof KATEGORI_VALID)[number])) kategori = "OPEN";
    namaKejuaraan = typeof bodyJson.nama_kejuaraan === "string" ? bodyJson.nama_kejuaraan.trim() : "";
    tahun = typeof bodyJson.tahun === "string" ? bodyJson.tahun.trim() || null : null;
    tingkat = typeof bodyJson.tingkat === "string" ? bodyJson.tingkat.trim() || null : null;
    if (tingkat && !TINGKAT_VALID.includes(tingkat as (typeof TINGKAT_VALID)[number])) tingkat = null;
    kelasPertandingan = typeof bodyJson.kelas_pertandingan === "string" ? bodyJson.kelas_pertandingan.trim() || null : null;
  }

  return { kategori, namaKejuaraan, tahun, tingkat, kelasPertandingan, file };
}

export async function POST(req: NextRequest) {
  const rateLimitRes = checkApiRateLimit(req, "keanggotaan-riwayat", { max: 30, windowMs: 60_000 });
  if (rateLimitRes) return rateLimitRes;

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const contentType = req.headers.get("content-type") ?? "";
  let formData: FormData | null = null;
  let bodyJson: Record<string, unknown> | null = null;

  if (contentType.includes("multipart/form-data")) {
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ message: "FormData tidak valid" }, { status: 400 });
    }
  } else {
    try {
      bodyJson = await req.json();
    } catch {
      bodyJson = {};
    }
  }

  const { kategori, namaKejuaraan, tahun, tingkat, kelasPertandingan, file } = parseBody(
    contentType,
    formData,
    bodyJson
  );

  if (!namaKejuaraan.trim()) {
    return NextResponse.json({ message: "Nama kejuaraan wajib diisi" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin.from("profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (!profile?.id) return NextResponse.json({ message: "Profile tidak ditemukan" }, { status: 404 });

  const { data: row, error } = await admin
    .from("prestasi")
    .insert({
      profile_id: profile.id,
      kategori,
      nama_kejuaraan: namaKejuaraan.trim(),
      tahun,
      tingkat,
      kelas_pertandingan: kelasPertandingan,
    })
    .select("id, kategori, nama_kejuaraan, tahun, tingkat, kelas_pertandingan, file_path, verified_at, verified_by")
    .single();

  if (error) return NextResponse.json({ message: error.message || "Gagal menyimpan prestasi" }, { status: 500 });

  let filePath: string | null = null;
  if (file) {
    const up = await uploadIjazah(user.id, "prestasi", String(row.id), file);
    if ("error" in up) return NextResponse.json({ message: up.error }, { status: 400 });
    filePath = up.path;
    await admin.from("prestasi").update({ file_path: filePath }).eq("id", row.id);
  }

  const fileUrl = filePath ? getPublicUrl(filePath) : null;
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
