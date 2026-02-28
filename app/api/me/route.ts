export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getUserScope } from "@/app/lib/scope/getUserScope";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id, user_id, nama, email_allowed, profile_completed, app_role")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: structural } = await admin.rpc("get_user_structural_roles", {
    p_user_id: user.id,
  });

  const scope = await getUserScope(admin, user.id);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email ?? null,
    },
    profile: profile ?? null,
    structural_roles: structural ?? [],
    functional_roles: [],
    scope,
  });
}

