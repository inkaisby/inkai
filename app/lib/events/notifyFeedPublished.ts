import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Saat berita/feed dipublish: notifikasi ke semua user yang punya akun (profiles.user_id),
 * kecuali pembuat posting.
 */
export async function notifyFeedPublished(
  admin: SupabaseClient,
  opts: { feedId: string; title: string; authorUserId: string | null },
): Promise<void> {
  try {
    const link = `/dashboard#post-${opts.feedId}`;
    const t = opts.title.trim() || "Postingan baru";
    const eventTitle = `Feed baru: ${t.length > 90 ? `${t.slice(0, 90)}…` : t}`;

    let q = admin.from("profiles").select("user_id").not("user_id", "is", null);
    if (opts.authorUserId) {
      q = q.neq("user_id", opts.authorUserId);
    }

    const { data: rows, error } = await q;
    if (error || !rows?.length) return;

    const seen = new Set<string>();
    const userIds: string[] = [];
    for (const r of rows) {
      const uid = r.user_id as string | null;
      if (!uid || seen.has(uid)) continue;
      seen.add(uid);
      userIds.push(uid);
    }
    if (userIds.length === 0) return;

    const chunkSize = 200;
    for (let i = 0; i < userIds.length; i += chunkSize) {
      const chunk = userIds.slice(i, i + chunkSize).map((user_id) => ({
        user_id,
        type: "feed_published",
        title: eventTitle,
        module: "home_feed",
        link,
      }));
      const { error: insErr } = await admin.from("events").insert(chunk);
      if (insErr) {
        console.warn("[notifyFeedPublished] insert batch:", insErr.message);
      }
    }
  } catch (e) {
    console.warn("[notifyFeedPublished]", e);
  }
}
