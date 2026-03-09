/**
 * POST /api/ukt/pendaftaran/[id]/ensure-kwitansi-token
 * Memastikan baris punya kwitansi_token (generate jika null). Mengembalikan token untuk dipakai di URL cetak/QR.
 */
import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getUserScope } from "@/app/lib/scope/getUserScope";
import { requireFunctionalRole } from "@/app/lib/security/requireFunctionalRole";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ message: "id wajib" }, { status: 400 });

  const admin = createSupabaseAdminClient();

  const { data: row, error: fetchErr } = await admin
    .from("ukt_pendaftaran")
    .select("id, ranting_id, status_bayar, kwitansi_token")
    .eq("id", id)
    .single();

  if (fetchErr || !row) {
    return NextResponse.json({ message: "Pendaftaran tidak ditemukan" }, { status: 404 });
  }

  if ((row as { status_bayar?: string }).status_bayar !== "lunas") {
    return NextResponse.json({ message: "Hanya untuk peserta yang sudah lunas" }, { status: 400 });
  }

  let token = (row as { kwitansi_token?: string | null }).kwitansi_token;
  if (token) {
    return NextResponse.json({ kwitansi_token: token });
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

  // Cetak/kwitansi: hanya BENDAHARA (atau superadmin/root)
  const { data: ranting } = await admin
    .from("ranting")
    .select("cabang_id")
    .eq("id", row.ranting_id)
    .maybeSingle();
  const cabangId = (ranting as { cabang_id?: string | null })?.cabang_id ?? null;
  const gate = await requireFunctionalRole(user, "BENDAHARA", [null, cabangId, String(row.ranting_id)]);
  if (!gate.ok) {
    return NextResponse.json({ message: "Aksi ini hanya untuk Bendahara" }, { status: gate.status });
  }

  const { data: updated, error: updateErr } = await admin
    .from("ukt_pendaftaran")
    .update({ kwitansi_token: crypto.randomUUID() })
    .eq("id", id)
    .select("kwitansi_token")
    .single();

  if (updateErr || !updated) {
    return NextResponse.json({ message: "Gagal membuat token kwitansi" }, { status: 500 });
  }

  token = (updated as { kwitansi_token: string }).kwitansi_token;
  return NextResponse.json({ kwitansi_token: token });
}
