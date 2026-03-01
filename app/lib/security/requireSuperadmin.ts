import "server-only";

import type { User } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";

const ROOT_EMAIL = process.env.INKAI_ROOT_EMAIL?.toLowerCase() ?? null;

export async function requireSuperadmin(user: User | null) {
  if (!user) return { ok: false as const, status: 401 as const };

  const email = user.email?.toLowerCase() ?? null;

  // Optional ROOT account configured via env
  if (ROOT_EMAIL && email && email === ROOT_EMAIL) {
    return { ok: true as const };
  }

  const admin = createSupabaseAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("app_role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return { ok: false as const, status: 403 as const };
  if ((profile?.app_role ?? "").toUpperCase() === "SUPERADMIN") return { ok: true as const };
  return { ok: false as const, status: 403 as const };
}

