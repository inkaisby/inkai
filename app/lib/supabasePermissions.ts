// app/lib/supabasePermissions.ts
import "server-only";

import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";

/* ===============================
 * ACTION MAP
 * =============================== */
export const ACTION_MAP: Record<string, Record<string, string>> = {
  user: {
    read: "USER_VIEW",
    create: "USER_CREATE",
    update: "USER_EDIT",
    delete: "USER_DELETE",
  },
  siswa: {
    read: "SISWA_VIEW",
    create: "SISWA_CREATE",
    update: "SISWA_EDIT",
    delete: "SISWA_DELETE",
  },
  inventaris: {
    read: "INVENTARIS_VIEW",
    create: "INVENTARIS_CREATE",
    update: "INVENTARIS_EDIT",
    delete: "INVENTARIS_DELETE",
  },
};

/* ===============================
 * GET USER PERMISSIONS
 * =============================== */
export async function getUserPermissions(email: string) {
  const supabaseAdmin = createSupabaseAdminClient();
  const { data, error } = await supabaseAdmin
    .from("permissions")
    .select("actions")
    .eq("email", email)
    .single();

  if (error || !data) return {};

  const permissions: Record<string, any> = {};

  for (const [scope, map] of Object.entries(ACTION_MAP)) {
    permissions[scope] = {};
    for (const [crud, actionCode] of Object.entries(map)) {
      permissions[scope][crud] = data.actions?.includes(actionCode) ?? false;
    }
  }

  return permissions;
}

/* ===============================
 * SAVE USER PERMISSIONS
 * =============================== */
export async function saveUserPermissions(
  email: string,
  permissions: Record<string, any>,
) {
  const supabaseAdmin = createSupabaseAdminClient();
  const actions = new Set<string>();

  for (const [scope, perms] of Object.entries(permissions)) {
    const map = ACTION_MAP[scope];
    if (!map) continue;

    for (const [crud, enabled] of Object.entries(perms as any)) {
      if (enabled && map[crud]) {
        actions.add(map[crud]);
      }
    }
  }

  await supabaseAdmin.from("permissions").upsert(
    {
      email,
      actions: Array.from(actions),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "email" }
  );
}
