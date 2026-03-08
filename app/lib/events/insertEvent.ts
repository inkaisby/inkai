import type { SupabaseClient } from "@supabase/supabase-js";

type EventPayload = {
  user_id: string;
  type: string;
  title: string;
  module?: string;
  detail?: Record<string, unknown>;
  link?: string;
};

/**
 * Helper untuk insert event notifikasi user.
 * Dipanggil dari API/server dengan admin client (bypass RLS).
 */
export async function insertEvent(
  admin: SupabaseClient,
  payload: EventPayload,
) {
  try {
    await admin.from("events").insert({
      user_id: payload.user_id,
      type: payload.type,
      title: payload.title,
      module: payload.module ?? null,
      detail: payload.detail ?? null,
      link: payload.link ?? null,
    });
  } catch (e) {
    // Jangan pernah memblokir alur utama hanya karena logging gagal
     
    console.warn("[insertEvent] gagal insert events:", e);
  }
}

