/**
 * GET: Nama ketua ranting untuk ranting ini (user dengan role KETUA_RANTING di ranting_id).
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getUserScope } from "@/app/lib/scope/getUserScope";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id: rantingId } = await params;
  if (!rantingId) {
    return NextResponse.json({ message: "id wajib" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const scope = await getUserScope(admin, user.id);
  const canAccess = scope.is_pp || (scope.ranting_ids.length > 0 && scope.ranting_ids.includes(rantingId));
  if (!canAccess) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { data: roleRow } = await admin
    .from("structural_role_master")
    .select("id")
    .eq("role_name", "KETUA_RANTING")
    .maybeSingle();

  if (!roleRow) {
    return NextResponse.json({ nama: null, user_id: null });
  }

  const { data: usr } = await admin
    .from("user_structural_roles")
    .select("user_id")
    .eq("ranting_id", rantingId)
    .eq("role_id", (roleRow as { id: string }).id)
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  if (!usr) {
    return NextResponse.json({ nama: null, user_id: null });
  }

  const uid = (usr as { user_id: string }).user_id;
  const { data: profile } = await admin
    .from("profiles")
    .select("nama")
    .eq("user_id", uid)
    .maybeSingle();

  const nama = (profile as { nama?: string | null } | null)?.nama ?? null;
  return NextResponse.json({ nama, user_id: uid });
}
