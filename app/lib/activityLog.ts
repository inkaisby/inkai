import "server-only";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";

export type ActivityDetail = Record<string, unknown> | null;

/**
 * Catat aktivitas user ke user_activity_logs (hanya dari server: API route / server action).
 * Tidak exposed ke client agar tidak bisa dipalsu.
 */
export async function logActivity(params: {
  user_id: string | null;
  email: string | null;
  action: string;
  module?: string | null;
  detail?: ActivityDetail;
}): Promise<void> {
  const admin = createSupabaseAdminClient();
  await admin.from("user_activity_logs").insert({
    user_id: params.user_id ?? null,
    email: params.email ?? null,
    action: params.action,
    module: params.module ?? null,
    detail: params.detail ?? null,
  });
}
