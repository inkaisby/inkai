export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getSessionUser } from "@/app/lib/supabase/session";
import { requireSuperadmin } from "@/app/lib/security/requireSuperadmin";

/**
 * TABLE: menu_permissions
 * - email (text)
 * - menu_key (text)
 * - enabled (boolean)
 * UNIQUE (email, menu_key)
 */

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  const gate = await requireSuperadmin(user);
  if (!gate.ok) {
    return NextResponse.json([], { status: gate.status });
  }

  const supabase = createSupabaseAdminClient();

  const email = new URL(req.url).searchParams.get("email");
  if (!email) return NextResponse.json([]);

  const { data, error } = await supabase
    .from("menu_permissions")
    .select("menu_key, enabled")
    .eq("email", email);

  if (error) {
    console.error("[menu-permissions][GET]", error);
    return NextResponse.json([]);
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  const gate = await requireSuperadmin(user);
  if (!gate.ok) {
    return NextResponse.json({ ok: false }, { status: gate.status });
  }

  const supabase = createSupabaseAdminClient();

  const { email, permissions } = await req.json();

  /**
   * permissions = {
   *   dashboard: true,
   *   inventaris: false,
   *   ...
   * }
   */

  const rows = Object.entries(permissions).map(
    ([menu_key, enabled]) => ({
      email,
      menu_key,
      enabled: Boolean(enabled),
    })
  );

  const { error } = await supabase
    .from("menu_permissions")
    .upsert(rows, { onConflict: "email,menu_key" });

  if (error) {
    console.error("[menu-permissions][POST]", error);
    return NextResponse.json({ ok: false });
  }

  return NextResponse.json({ ok: true });
}
