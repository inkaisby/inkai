/**
 * POST: Upload gambar produk marketplace → bucket home_feed, path {user_id}/marketplace/…
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import {
  MARKETPLACE_IMAGE_MAX_BYTES,
  MARKETPLACE_IMAGE_MAX_KB,
} from "@/app/lib/marketplaceImageLimits";

export const runtime = "nodejs";

const BUCKET = "home_feed";
const MAX_SIZE_BYTES = MARKETPLACE_IMAGE_MAX_BYTES;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

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
      return NextResponse.json({ message: "Invalid form data" }, { status: 400 });
    }

    const file = formData.get("file") as File | null;
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { message: "File tidak ditemukan. Gunakan field 'file'." },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { message: "Tipe file tidak diizinkan. Gunakan JPEG, PNG, WebP, atau GIF." },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        {
          message: `File melebihi ${MARKETPLACE_IMAGE_MAX_KB} KB. JPG/PNG/WebP diperkecil di browser dulu; GIF maks. ${MARKETPLACE_IMAGE_MAX_KB} KB.`,
        },
        { status: 400 },
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeExt = ["jpeg", "jpg", "png", "webp", "gif"].includes(ext) ? ext : "jpg";
    const filePath = `${user.id}/marketplace/${Date.now()}.${safeExt}`;

    const admin = createSupabaseAdminClient();
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error } = await admin.storage.from(BUCKET).upload(filePath, buffer, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

    if (error) {
      console.error("[konten/marketplace/upload]", error);
      const isBucketMissing =
        error.message?.toLowerCase().includes("bucket") &&
        (error.message?.toLowerCase().includes("not found") ||
          error.message?.toLowerCase().includes("not exist"));
      return NextResponse.json(
        {
          message: isBucketMissing
            ? "Bucket 'home_feed' belum ada. Jalankan migration storage home_feed di Supabase."
            : error.message || "Gagal mengunggah gambar",
        },
        { status: 500 },
      );
    }

    const { data } = admin.storage.from(BUCKET).getPublicUrl(filePath);
    const url = data?.publicUrl ?? null;
    if (!url) {
      return NextResponse.json({ message: "Gagal mendapatkan URL gambar" }, { status: 500 });
    }

    return NextResponse.json({ url });
  } catch (err) {
    console.error("[konten/marketplace/upload]", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Gagal mengunggah gambar" },
      { status: 500 },
    );
  }
}
