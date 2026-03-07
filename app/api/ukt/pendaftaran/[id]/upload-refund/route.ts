/**
 * POST: Upload bukti transfer pengembalian dana (cabang). Hanya untuk pendaftaran yang sudah batal.
 * Body: FormData dengan field "file" (PDF atau gambar).
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getUserScope } from "@/app/lib/scope/getUserScope";
import { uploadUktRefundBukti } from "@/app/lib/storage/ijazah";
import { insertEvent } from "@/app/lib/events/insertEvent";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ message: "id wajib" }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ message: "Body harus FormData" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { message: "Field 'file' wajib (PDF atau gambar)" },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdminClient();
  const { data: row, error: fetchErr } = await admin
    .from("ukt_pendaftaran")
    .select("id, ranting_id, status_bayar")
    .eq("id", id)
    .single();

  if (fetchErr || !row) {
    return NextResponse.json(
      { message: "Pendaftaran tidak ditemukan" },
      { status: 404 }
    );
  }

  if ((row as { status_bayar?: string }).status_bayar !== "batal") {
    return NextResponse.json(
      { message: "Bukti pengembalian hanya untuk peserta yang sudah batal" },
      { status: 400 }
    );
  }

  const scope = await getUserScope(admin, user.id);
  const canAccessRanting =
    scope.is_pp ||
    (scope.ranting_ids.length > 0 && scope.ranting_ids.includes(row.ranting_id as string));
  const canEditRefund = scope.is_pp || scope.cabang_ids.length > 0;
  if (!canAccessRanting || !canEditRefund) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const result = await uploadUktRefundBukti(id, file);
  if ("error" in result) {
    return NextResponse.json({ message: result.error }, { status: 400 });
  }

  const { error: updateErr } = await admin
    .from("ukt_pendaftaran")
    .update({
      refund_bukti_path: result.path,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateErr) {
    console.error("[ukt/pendaftaran upload-refund] update", updateErr);
    return NextResponse.json({ message: updateErr.message }, { status: 500 });
  }

  await insertEvent(admin, {
    user_id: user.id,
    type: "ukt_refund_bukti_upload",
    title: "Upload bukti pengembalian dana UKT",
    module: "ukt",
    detail: {
      id,
      ranting_id: row.ranting_id,
      path: result.path,
    },
  });

  return NextResponse.json({
    ok: true,
    path: result.path,
  });
}
