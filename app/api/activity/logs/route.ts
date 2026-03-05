import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { requireSuperadmin } from "@/app/lib/security/requireSuperadmin";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * GET ?email=... — Daftar log aktivitas untuk email tersebut. Hanya Superadmin.
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const gate = await requireSuperadmin(user);
  if (!gate.ok) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const email = req.nextUrl.searchParams.get("email");
  if (!email?.trim()) {
    return NextResponse.json({ message: "email required" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("user_activity_logs")
    .select("id, user_id, email, action, module, detail, created_at")
    .eq("email", email.trim())
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
