/**
 * PATCH: Update pendaftaran (total_bayar, bukti_transfer_path, atau konfirmasi lunas).
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getUserScope } from "@/app/lib/scope/getUserScope";
import { insertEvent } from "@/app/lib/events/insertEvent";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(
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

  let body: {
    total_bayar?: number | null;
    bukti_transfer_path?: string | null;
    status_bayar?: "menunggu_bayar" | "bukti_uploaded" | "lunas" | "batal";
    alasan_batal?: string | null;
    refund_jumlah?: number | null;
    refund_status?: "tidak_ada" | "pending" | "dikembalikan";
    refund_catatan?: string | null;
    refund_bukti_path?: string | null;
    /** Hasil ujian: diisi Cabang setelah ujian selesai; terintegrasi ke Keanggotaan tab Kyu */
    lulus?: boolean;
    tingkat_lulus?: number | null;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Body harus JSON" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  const { data: row, error: fetchErr } = await admin
    .from("ukt_pendaftaran")
    .select("id, ranting_id, status_bayar, profile_id, tahun_ajaran_id")
    .eq("id", id)
    .single();

  if (fetchErr || !row) {
    return NextResponse.json(
      { message: "Pendaftaran tidak ditemukan" },
      { status: 404 }
    );
  }

  const scope = await getUserScope(admin, user.id);
  let canAccess =
    scope.is_pp ||
    (scope.ranting_ids.length > 0 && scope.ranting_ids.includes(row.ranting_id as string));
  if (!canAccess && scope.cabang_ids.length > 0) {
    const { data: ranting } = await admin
      .from("ranting")
      .select("cabang_id")
      .eq("id", row.ranting_id)
      .maybeSingle();
    canAccess = !!ranting?.cabang_id && scope.cabang_ids.includes(ranting.cabang_id as string);
  }
  if (!canAccess) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const now = new Date().toISOString();
  const currentStatus = (row as { status_bayar?: string }).status_bayar;
  const payload: Record<string, unknown> = {
    updated_at: now,
  };
  if (body.total_bayar !== undefined) payload.total_bayar = body.total_bayar;
  if (body.bukti_transfer_path !== undefined) payload.bukti_transfer_path = body.bukti_transfer_path;
  if (body.status_bayar !== undefined) {
    payload.status_bayar = body.status_bayar;
    if (body.status_bayar === "lunas") {
      payload.dikonfirmasi_oleh = user.id;
      payload.dikonfirmasi_at = now;
    }
    if (body.status_bayar === "batal") {
      payload.batal_at = now;
      if (body.alasan_batal !== undefined) payload.alasan_batal = body.alasan_batal?.trim() || null;
      if (body.refund_jumlah !== undefined) payload.refund_jumlah = body.refund_jumlah;
      if (body.refund_status !== undefined) payload.refund_status = body.refund_status ?? "tidak_ada";
      if (body.refund_catatan !== undefined) payload.refund_catatan = body.refund_catatan?.trim() || null;
      if (body.refund_status === "dikembalikan") payload.refund_at = now;
    }
  }
  // Cabang: update hanya refund untuk record yang sudah batal (tanpa mengirim status_bayar)
  if (currentStatus === "batal" && (body.refund_status !== undefined || body.refund_jumlah !== undefined || body.refund_catatan !== undefined || body.refund_bukti_path !== undefined)) {
    if (body.refund_jumlah !== undefined) payload.refund_jumlah = body.refund_jumlah;
    if (body.refund_status !== undefined) {
      payload.refund_status = body.refund_status ?? "tidak_ada";
      if (body.refund_status === "dikembalikan") payload.refund_at = now;
    }
    if (body.refund_catatan !== undefined) payload.refund_catatan = body.refund_catatan?.trim() || null;
    if (body.refund_bukti_path !== undefined) payload.refund_bukti_path = body.refund_bukti_path?.trim() || null;
  }
  if (body.lulus !== undefined) payload.lulus = !!body.lulus;
  if (body.tingkat_lulus !== undefined) {
    const t = body.tingkat_lulus;
    payload.tingkat_lulus = t == null || t === "" ? null : Math.min(10, Math.max(1, Number(t)));
  }

  const { data: updated, error } = await admin
    .from("ukt_pendaftaran")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[ukt/pendaftaran PATCH]", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const finalStatus = (updated as { status_bayar?: string })?.status_bayar ?? body.status_bayar ?? currentStatus;
  const onlyRefundUpdate = currentStatus === "batal" && body.status_bayar === undefined && (body.refund_status !== undefined || body.refund_jumlah !== undefined);
  const title =
    onlyRefundUpdate
      ? "Pengembalian dana UKT (peserta batal)"
      : finalStatus === "lunas"
        ? "Konfirmasi pembayaran UKT (lunas)"
        : finalStatus === "batal"
          ? "Peserta batal ikut UKT"
          : "Perubahan data pendaftaran UKT";
  await insertEvent(admin, {
    user_id: user.id,
    type: "ukt_pendaftaran_update",
    title,
    module: "ukt",
    detail: {
      id,
      status_bayar: finalStatus,
      total_bayar: body.total_bayar ?? null,
      ...((finalStatus === "batal" || onlyRefundUpdate) && {
        alasan_batal: body.alasan_batal ?? null,
        refund_jumlah: body.refund_jumlah ?? null,
        refund_status: body.refund_status ?? null,
        refund_at: body.refund_status === "dikembalikan" ? now : null,
      }),
    },
  });

  return NextResponse.json(updated);
}
