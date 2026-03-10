import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getSessionUser } from "@/app/lib/supabase/session";

export const runtime = "nodejs";

const BUCKET = "profile_docs";
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

type DocKind = "ktp" | "akta_lahir" | "kk";

function isDocKind(v: unknown): v is DocKind {
  return v === "ktp" || v === "akta_lahir" || v === "kk";
}

function extFromFile(file: File): string {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (["pdf", "jpeg", "jpg", "png", "webp"].includes(ext)) return ext;
  if (file.type === "application/pdf") return "pdf";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

/**
 * POST: Upload dokumen profil (KTP/Akta Lahir/KK) via server.
 * Body: FormData { file, kind: "ktp" | "akta_lahir" | "kk" }
 * On success: update kolom profiles.(ktp_path|akta_lahir_path|kk_path) untuk user yang login.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ message: "Body harus FormData" }, { status: 400 });
    }

    const kindRaw = formData.get("kind");
    if (!isDocKind(kindRaw)) {
      return NextResponse.json(
        { message: "Field 'kind' wajib: ktp | akta_lahir | kk" },
        { status: 400 },
      );
    }

    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ message: "Field 'file' wajib" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { message: "Tipe file harus PDF atau gambar (JPG/PNG/WebP)." },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { message: "Ukuran file maksimal 2MB." },
        { status: 400 },
      );
    }

    const admin = createSupabaseAdminClient();

    // Pastikan ada baris profiles (fallback sama seperti /api/me)
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!existing) {
      await admin.from("profiles").insert({
        id: crypto.randomUUID(),
        user_id: user.id,
        email: user.email ?? "",
        nama: user.email ?? "",
        app_role: "USER",
        email_allowed: true,
      });
    }

    const ext = extFromFile(file);
    const safeKind = kindRaw as DocKind;
    const filePath = `${user.id}/${safeKind}_${Date.now()}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await admin.storage.from(BUCKET).upload(filePath, buffer, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: true,
    });
    if (upErr) {
      console.error("[upload-document] upload", upErr);
      return NextResponse.json(
        { message: upErr.message || "Gagal mengunggah dokumen" },
        { status: 500 },
      );
    }

    const col =
      safeKind === "ktp"
        ? "ktp_path"
        : safeKind === "akta_lahir"
          ? "akta_lahir_path"
          : "kk_path";

    const { error: dbErr } = await admin
      .from("profiles")
      .update({ [col]: filePath, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    if (dbErr) {
      console.error("[upload-document] update profiles", dbErr);
      return NextResponse.json(
        { message: dbErr.message || "Gagal menyimpan path dokumen" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, kind: safeKind, path: filePath });
  } catch (err) {
    console.error("[upload-document] unexpected error:", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Gagal mengunggah dokumen" },
      { status: 500 },
    );
  }
}

