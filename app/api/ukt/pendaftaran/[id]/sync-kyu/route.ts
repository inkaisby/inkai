/**
 * POST /api/ukt/pendaftaran/[id]/sync-kyu
 * Sync kyu_dan_terakhir dari tabel kyu/dan ke ukt_pendaftaran.
 * Berguna ketika pendaftaran punya kyu kosong tapi data Kyu sudah ada di Keanggotaan.
 */
import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getUserScope } from "@/app/lib/scope/getUserScope";

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
    .select("id, ranting_id, profile_id")
    .eq("id", id)
    .single();

  if (fetchErr || !row) {
    return NextResponse.json({ message: "Pendaftaran tidak ditemukan" }, { status: 404 });
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

  const profileId = row.profile_id as string;
  const [kyuRes, danRes] = await Promise.all([
    admin.from("kyu").select("level").eq("profile_id", profileId).order("level", { ascending: false }).limit(1).maybeSingle(),
    admin.from("dan").select("dan").eq("profile_id", profileId).order("dan", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const dan = (danRes.data as { dan?: number } | null)?.dan ?? 0;
  const kyu = (kyuRes.data as { level?: number } | null)?.level ?? 0;

  let kyuDanValue: string | null = null;
  if (dan > 0) {
    kyuDanValue = "Dan " + dan;
  } else if (kyu > 0) {
    kyuDanValue = "Kyu " + kyu;
  }

  if (!kyuDanValue) {
    return NextResponse.json({ message: "Belum ada data Kyu/Dan di Keanggotaan untuk profil ini" }, { status: 400 });
  }

  const { error: updateErr } = await admin
    .from("ukt_pendaftaran")
    .update({ kyu_dan_terakhir: kyuDanValue, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (updateErr) {
    console.error("[ukt/pendaftaran sync-kyu]", updateErr);
    return NextResponse.json({ message: "Gagal memperbarui Kyu" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, kyu_dan_terakhir: kyuDanValue });
}
