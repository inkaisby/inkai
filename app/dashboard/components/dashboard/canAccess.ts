// app/dashboard/components/dashboard/canAccess.ts

/**
 * Menu yang tampil ke SEMUA user (tanpa syarat wilayah / level struktural / role fungsional).
 * Isi konten di dalam halaman tetap bisa berbeda per level/fungsional (filter data di masing-masing module).
 */
const UNIVERSAL_MENU_KEYS = new Set<string>([
  "dashboard",
  "keanggotaan",
  "ujian",
  "event",
]);

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

  functional_roles?: {
    role_name: string;
    active: boolean;
  }[];
};

/* ================= ACCESS FUNCTION ================= */
const ROOT_EMAIL = process.env.NEXT_PUBLIC_INKAI_ROOT_EMAIL?.toLowerCase() ?? null;

export function canAccessMenu(
  menu: MenuAccess,

  user: SessionUserAccess | null,
): boolean {
  if (!user) return false;

  const email = user.email?.toLowerCase() ?? null;

  // Superadmin / root selalu bisa akses semua menu
  if (ROOT_EMAIL && email && email === ROOT_EMAIL) return true;
  if ((user.app_role ?? "").toUpperCase() === "SUPERADMIN") return true;

  // Menu universal: tampil ke SEMUA user (termasuk yang email_allowed = false)
  if (menu.key && UNIVERSAL_MENU_KEYS.has(menu.key)) {
    return true;
  }

  // Akun ditangguhkan (email_allowed = false): selain menu universal, hanya Dashboard
  if (user.email_allowed === false) {
    return menu.key === "dashboard";
  }

  if (menu.superadmin_only) return false;

  if (
    menu.required_structural_level !== null &&
    menu.required_structural_level !== undefined
  ) {
    const hasLevel =
      user.structural_roles?.some(
        (r) =>
          r.active &&
          r.structural_level >= menu.required_structural_level!,
      ) ?? false;

    if (!hasLevel) return false;
  }

  if (menu.required_functional_role) {
    const hasRole =
      user.functional_roles?.some(
        (r) =>
          r.active &&
          r.role_name === menu.required_functional_role,
      ) ?? false;

    if (!hasRole) return false;
  }

  return true;
}
