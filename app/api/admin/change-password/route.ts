export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { requireSuperadmin } from "@/app/lib/security/requireSuperadmin";
import { isValidUuid } from "@/app/lib/security/validateUuid";

/**
 * POST: Ubah password user (hanya Superadmin).
 * Body: { userId: string, newPassword: string, signOut?: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const me = await getSessionUser();
    if (!me) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const gate = await requireSuperadmin(me);
    if (!gate.ok) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const userId = typeof body?.userId === "string" ? body.userId.trim() : "";
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

    if (!userId || !isValidUuid(userId)) {
      return NextResponse.json(
        { message: "userId tidak valid" },
        { status: 400 }
      );
    }
    if (newPassword.length < 8) {
      return NextResponse.json(
        { message: "Password baru minimal 8 karakter" },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      return NextResponse.json(
        { message: error.message },
        { status: 500 }
      );
    }

    // signOut: body tetap diterima; di Supabase terbaru update password bisa invalidate sesi user
    return NextResponse.json({ ok: true, message: "Password berhasil diubah." });
  } catch (err) {
    console.error("[API admin/change-password]", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
