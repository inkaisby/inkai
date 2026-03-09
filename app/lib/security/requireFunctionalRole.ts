import "server-only";

import type { User } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { requireSuperadmin } from "@/app/lib/security/requireSuperadmin";

/**
 * Gate akses berdasarkan role fungsional (user_functional_roles).
 * - Mengizinkan SUPERADMIN/root.
 * - Mendukung context_id:
 *   - Jika contextCandidates kosong/undefined: cek role global (context_id NULL) atau role di konteks mana pun.
 *   - Jika contextCandidates ada: accept jika role aktif dengan context_id NULL (global) atau salah satu contextCandidates.
 */
export async function requireFunctionalRole(
  user: User | null,
  role: string,
  contextCandidates?: Array<string | null | undefined>
) {
  if (!user) return { ok: false as const, status: 401 as const };

  const gate = await requireSuperadmin(user);
  if (gate.ok) return { ok: true as const };

  const normalized = role.trim().toUpperCase().replace(/\s+/g, "_");
  if (!normalized) return { ok: false as const, status: 403 as const };

  const admin = createSupabaseAdminClient();

  const contexts = (contextCandidates ?? [])
    .map((c) => (c != null ? String(c).trim() : null))
    .filter((c) => c && c.length > 0) as string[];

  // Global role (context_id NULL) selalu diterima.
  const { data: globalRow } = await admin
    .from("user_functional_roles")
    .select("id")
    .eq("user_id", user.id)
    .eq("role", normalized)
    .eq("active", true)
    .is("context_id", null)
    .maybeSingle();
  if (globalRow) return { ok: true as const };

  // Jika tidak ada konteks kandidat, cek role aktif di konteks mana pun.
  if (contexts.length === 0) {
    const { data: anyCtxRow } = await admin
      .from("user_functional_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", normalized)
      .eq("active", true)
      .maybeSingle();
    if (anyCtxRow) return { ok: true as const };
    return { ok: false as const, status: 403 as const };
  }

  const { data: ctxRow } = await admin
    .from("user_functional_roles")
    .select("id")
    .eq("user_id", user.id)
    .eq("role", normalized)
    .eq("active", true)
    .in("context_id", contexts)
    .maybeSingle();

  if (ctxRow) return { ok: true as const };
  return { ok: false as const, status: 403 as const };
}

