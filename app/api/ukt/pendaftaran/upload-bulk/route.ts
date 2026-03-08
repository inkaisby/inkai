/**
 * POST: Upload satu bukti transfer untuk banyak pendaftaran (bayar sekaligus).
 * Body: FormData dengan "file" dan "ids" (comma-separated pendaftaran ids).
 * Semua id harus dari ranting yang sama dan user punya akses.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getUserScope } from "@/app/lib/scope/getUserScope";
import { uploadUktBuktiBulk } from "@/app/lib/storage/ijazah";
import { insertEvent } from "@/app/lib/events/insertEvent";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ message: "Body harus FormData" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ message: "Field 'file' wajib (PDF atau gambar)" }, { status: 400 });
  }

  const idsRaw = formData.get("ids");
  const ids = typeof idsRaw === "string"
    ? idsRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  if (ids.length === 0) {
    return NextResponse.json({ message: "Field 'ids' wajib (min 1 id, comma-separated)" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const scope = await getUserScope(admin, user.id);

  const { data: rows, error: fetchErr } = await admin
    .from("ukt_pendaftaran")
    .select("id, ranting_id")
    .in("id", ids);

  if (fetchErr || !rows?.length) {
    return NextResponse.json({ message: "Pendaftaran tidak ditemukan" }, { status: 404 });
  }

  const rantingIds = Array.from(new Set((rows as { ranting_id: string }[]).map((r) => r.ranting_id)));
  if (rantingIds.length > 1) {
    return NextResponse.json({ message: "Semua peserta harus dari ranting yang sama" }, { status: 400 });
  }
  const rantingId = rantingIds[0];
  const canAccess =
    scope.is_pp ||
    (scope.ranting_ids.length > 0 && scope.ranting_ids.includes(rantingId));
  if (!canAccess) {
    return NextResponse.json({ message: "Tidak punya akses ke ranting ini" }, { status: 403 });
  }

  const uniqueSuffix = randomUUID();
  const result = await uploadUktBuktiBulk(file, uniqueSuffix);
  if ("error" in result) {
    return NextResponse.json({ message: result.error }, { status: 400 });
  }

  const { error: updateErr } = await admin
    .from("ukt_pendaftaran")
    .update({
      bukti_transfer_path: result.path,
      status_bayar: "bukti_uploaded",
      alasan_tolak_bukti: null,
      updated_at: new Date().toISOString(),
    })
    .in("id", ids);

  if (updateErr) {
    return NextResponse.json({ message: updateErr.message || "Gagal memperbarui pendaftaran" }, { status: 500 });
  }

  await insertEvent(admin, {
    user_id: user.id,
    type: "ukt_bukti_upload_bulk",
    title: "Upload bukti pembayaran UKT (sekali untuk banyak peserta)",
    module: "ukt",
    detail: { ids, ranting_id: rantingId, path: result.path },
  });

  return NextResponse.json({
    ok: true,
    path: result.path,
    updated: ids.length,
    status_bayar: "bukti_uploaded",
  });
}
