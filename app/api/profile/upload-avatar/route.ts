import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getSessionUser } from "@/app/lib/supabase/session";

export const runtime = "nodejs";

const BUCKET = "avatars_v2";
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

/**
 * POST: Upload avatar via server (service role) untuk menghindari error 42P01
 * saat upload dari client ke Storage. Client kirim file, server upload ke bucket.
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
      return NextResponse.json(
        { message: "Invalid form data" },
        { status: 400 }
      );
    }

    const file = formData.get("file") ?? formData.get("avatar");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { message: "File tidak ditemukan. Gunakan field 'file' atau 'avatar'." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { message: "Tipe file tidak diizinkan. Gunakan JPEG, PNG, GIF, atau WebP." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { message: "Ukuran file maksimal 2MB." },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeExt = ["jpeg", "jpg", "png", "gif", "webp"].includes(ext)
      ? ext
      : "jpg";
    const filePath = `${user.id}/avatar_${Date.now()}.${safeExt}`;

    const admin = createSupabaseAdminClient();
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error } = await admin.storage
      .from(BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: true,
      });

    if (error) {
      console.error("[upload-avatar]", error);
      return NextResponse.json(
        { message: error.message || "Gagal mengunggah avatar" },
        { status: 500 }
      );
    }

    return NextResponse.json({ path: filePath });
  } catch (err) {
    console.error("[upload-avatar] unexpected error:", err);
    return NextResponse.json(
      {
        message:
          err instanceof Error ? err.message : "Gagal mengunggah avatar",
      },
      { status: 500 }
    );
  }
}
