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
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Body harus JSON" }, { status: 400 });
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

  const scope = await getUserScope(admin, user.id);
  const canAccess =
    scope.is_pp ||
    (scope.ranting_ids.length > 0 && scope.ranting_ids.includes(row.ranting_id as string));
  if (!canAccess) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (body.total_bayar !== undefined) payload.total_bayar = body.total_bayar;
  if (body.bukti_transfer_path !== undefined) payload.bukti_transfer_path = body.bukti_transfer_path;
  if (body.status_bayar !== undefined) {
    payload.status_bayar = body.status_bayar;
    if (body.status_bayar === "lunas") {
      payload.dikonfirmasi_oleh = user.id;
      payload.dikonfirmasi_at = new Date().toISOString();
    }
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

  // Event notifikasi: perubahan status / pembayaran
  await insertEvent(admin, {
    user_id: user.id,
    type: "ukt_pendaftaran_update",
    title:
      body.status_bayar === "lunas"
        ? "Konfirmasi pembayaran UKT (lunas)"
        : "Perubahan data pendaftaran UKT",
    module: "ukt",
    detail: {
      id,
      status_bayar: body.status_bayar ?? row.status_bayar,
      total_bayar: body.total_bayar ?? null,
    },
  });

  return NextResponse.json(updated);
}
