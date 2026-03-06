// app/dashboard/components/dashboard/canAccess.ts

/**
 * Menu yang tampil ke SEMUA user level 2+ (tanpa syarat lain).
 * Kohai (level 1) hanya boleh Dashboard + Keanggotaan (dicek di bawah).
 */
const UNIVERSAL_MENU_KEYS = new Set<string>([
  "dashboard",
  "keanggotaan",
  "ujian",
  "event",
]);

/** Level tertinggi user dari structural_roles atau profile_structural_level. */
function getEffectiveMaxLevel(user: SessionUserAccess): number {
  const fromRoles = user.structural_roles?.filter((r) => r.active).map((r) => r.structural_level) ?? [];
  const fromProfile = user.profile_structural_level != null ? [user.profile_structural_level] : [];
  const all = [...fromRoles, ...fromProfile];
  return all.length ? Math.max(...all) : 0;
}

/* ================= TYPES ================= */

export type MenuAccess = {
  key?: string;
  superadmin_only?: boolean;
  required_structural_level?: number | null;
  required_functional_role?: string | null;
  context_required?: boolean;
};

export type SessionUserAccess = {
  email?: string;
  /** true = akun disetujui/aktif (akses sesuai role); false = akun ditangguhkan (hanya lihat Dashboard). Sumber: profiles.email_allowed. */
  email_allowed?: boolean;
  app_role?: string | null;

  structural_roles?: {
    structural_level: number;
    active: boolean;
  }[];

  /** Fallback: level dari profiles.structural_level (Settings → Profil) bila user_structural_roles kosong. */
  profile_structural_level?: number | null;

  /** Domisili: regency_id dari profil (untuk pre-fill Home Base kabupaten/kota). */
  profile_regency_id?: string | null;

  functional_roles?: {
    role_name: string;
    active: boolean;
    context_id?: string | null;
  }[];
};

/* ================= ACCESS FUNCTION ================= */
const ROOT_EMAIL = process.env.NEXT_PUBLIC_INKAI_ROOT_EMAIL?.toLowerCase() ?? null;

/**
 * @param activeContextId - Opsional. Jika menu punya context_required dan required_functional_role,
 *   dan activeContextId diberikan, user harus punya role untuk context tersebut.
 *   Tanpa activeContextId: cek role di konteks mana pun (agregasi).
 */
export function canAccessMenu(
  menu: MenuAccess,
  user: SessionUserAccess | null,
  activeContextId?: string | null,
): boolean {
  if (!user) return false;

  const email = user.email?.toLowerCase() ?? null;

  // Superadmin / root selalu bisa akses semua menu
  if (ROOT_EMAIL && email && email === ROOT_EMAIL) return true;
  if ((user.app_role ?? "").toUpperCase() === "SUPERADMIN") return true;

  const maxLevel = getEffectiveMaxLevel(user);

  // Kohai (level 1): hanya Dashboard dan Keanggotaan
  if (maxLevel === 1) {
    return menu.key === "dashboard" || menu.key === "keanggotaan";
  }

  // Menu universal: tampil ke user level 2+ (termasuk yang email_allowed = false)
  if (menu.key && UNIVERSAL_MENU_KEYS.has(menu.key)) {
    return true;
  }

  // Akun ditangguhkan (email_allowed = false): selain menu universal, hanya Dashboard
  if (user.email_allowed === false) {
    return menu.key === "dashboard";
  }

  if (menu.superadmin_only) return false;

  // home-base: structural >= 2 ATAU functional role aktif (user tanpa role tidak boleh)
  if (menu.key === "home-base") {
    const hasStructural = maxLevel >= 2;
    const hasFunctional =
      user.functional_roles?.some((r) => r.active) ?? false;
    return hasStructural || hasFunctional;
  }

  if (
    menu.required_structural_level !== null &&
    menu.required_structural_level !== undefined
  ) {
    const required = menu.required_structural_level;
    const fromRoles =
      user.structural_roles?.some(
        (r) => r.active && r.structural_level >= required,
      ) ?? false;
    const fromProfile =
      user.profile_structural_level != null &&
      user.profile_structural_level >= required;
    if (!fromRoles && !fromProfile) return false;
  }

  if (menu.required_functional_role) {
    const requiredRole = menu.required_functional_role;
    let hasRole: boolean;

    if (menu.context_required && activeContextId) {
      hasRole =
        user.functional_roles?.some(
          (r) =>
            r.active &&
            r.role_name === requiredRole &&
            (r.context_id ?? null) === activeContextId,
        ) ?? false;
    } else {
      hasRole =
        user.functional_roles?.some(
          (r) => r.active && r.role_name === requiredRole,
        ) ?? false;
    }

    if (!hasRole) return false;
  }

  return true;
}
