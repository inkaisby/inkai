export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getSessionUser } from "@/app/lib/supabase/session";
import { requireSuperadmin } from "@/app/lib/security/requireSuperadmin";

const ALLOWED_APP_ROLES = ["USER", "ADMIN", "SUPERADMIN"] as const;

export async function POST(req: NextRequest) {
  try {
    const me = await getSessionUser();
    const gate = await requireSuperadmin(me);
    if (!gate.ok) {
      return NextResponse.json({ message: "Forbidden" }, { status: gate.status });
    }

    const supabaseAdmin = createSupabaseAdminClient();

    const body = await req.json();
    const {
      email,
      password,
      nama = null,
      app_role = "USER",
    } = body ?? {};

    if (!email || !password) {
      return NextResponse.json(
        { message: "email dan password wajib diisi" },
        { status: 400 },
      );
    }

    const normalizedRole = String(app_role || "USER").toUpperCase();
    if (!ALLOWED_APP_ROLES.includes(normalizedRole as (typeof ALLOWED_APP_ROLES)[number])) {
      return NextResponse.json(
        { message: "app_role tidak valid" },
        { status: 400 },
      );
    }

    /* ===============================
     * 1) CREATE AUTH USER
     * =============================== */
    const { data, error } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // langsung aktif
      });

    if (error || !data?.user) {
      return NextResponse.json(
        { message: error?.message ?? "Gagal membuat user" },
        { status: 500 }
      );
    }

    const user = data.user;

    /* ===============================
     * 2) CREATE PROFILE (UPSERT)
     * =============================== */
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: user.id,
        email: user.email,
        nama,
        app_role: normalizedRole,
      });

    if (profileError) {
      // user auth sudah dibuat, tapi profile gagal
      // (tetap kembalikan sukses + warning)
      return NextResponse.json({
        ok: true,
        user: {
          id: user.id,
          email: user.email,
        },
        warning: profileError.message,
      });
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (err: unknown) {
    console.error("[API /users/create] error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
