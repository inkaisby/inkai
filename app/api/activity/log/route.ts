import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { requireSuperadmin } from "@/app/lib/security/requireSuperadmin";
import { logActivity } from "@/app/lib/activityLog";

export const runtime = "nodejs";

/**
 * POST — Catat satu log aktivitas untuk user (email). Hanya Superadmin.
 * Body: { email: string, action: string, module?: string, detail?: object }
 * Dipanggil dari Settings (mis. setelah tambah role) agar aktivitas tercatat.
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const gate = await requireSuperadmin(user);
  if (!gate.ok) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const email = typeof body?.email === "string" ? body.email.trim() : null;
  const action = typeof body?.action === "string" ? body.action.trim() : null;

  if (!email || !action) {
    return NextResponse.json(
      { message: "email dan action wajib" },
      { status: 400 }
    );
  }

  const module_ = typeof body?.module === "string" ? body.module.trim() : null;
  const detail =
    body?.detail != null && typeof body.detail === "object" && !Array.isArray(body.detail)
      ? (body.detail as Record<string, unknown>)
      : undefined;

  try {
    await logActivity({
      user_id: null,
      email,
      action,
      module: module_,
      detail,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[API activity/log]", err);
    return NextResponse.json(
      { message: "Gagal mencatat log" },
      { status: 500 }
    );
  }
}
