import "server-only";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validasi UUID v4 untuk mencegah injection / parameter yang tidak valid.
 * Gunakan sebelum memakai userId ke Supabase/DB.
 */
export function isValidUuid(value: string): boolean {
  return typeof value === "string" && value.length === 36 && UUID_REGEX.test(value);
}
