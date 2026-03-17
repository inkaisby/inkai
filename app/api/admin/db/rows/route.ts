export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { requireSuperadmin } from "@/app/lib/security/requireSuperadmin";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";

const SYSTEM_PREFIXES = [
  "auth_",
  "mfa_",
  "oauth_",
  "saml_",
  "sso_",
  "pg_",
  "realtime_",
  "storage_",
  "supabase_",
];

const SYSTEM_TABLES_EXACT = new Set([
  "objects",
  "buckets",
  "migrations",
  "schema_migrations",
  "secrets",
  "refresh_tokens",
  "one_time_tokens",
  "password_resets",
]);

function isBlockedTable(name: string) {
  if (SYSTEM_TABLES_EXACT.has(name)) return true;
  if (SYSTEM_PREFIXES.some((p) => name.startsWith(p))) return true;
  return false;
}

export async function GET(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const gate = await requireSuperadmin(me);
  if (!gate.ok) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const table = url.searchParams.get("table")?.trim() ?? "";
  const limitRaw = url.searchParams.get("limit") ?? "25";
  const offsetRaw = url.searchParams.get("offset") ?? "0";

  if (!table) return NextResponse.json({ message: "table is required" }, { status: 400 });
  if (isBlockedTable(table)) {
    return NextResponse.json({ message: "Table dibatasi" }, { status: 403 });
  }

  const limit = Math.max(1, Math.min(parseInt(limitRaw, 10) || 25, 100));
  const offset = Math.max(0, parseInt(offsetRaw, 10) || 0);

  const admin = createSupabaseAdminClient();

  // Ensure table exists in public schema
  const { data: exists, error: existErr } = await admin
    .from("information_schema.tables")
    .select("table_name")
    .eq("table_schema", "public")
    .eq("table_name", table)
    .limit(1)
    .maybeSingle();

  if (existErr) return NextResponse.json({ message: existErr.message }, { status: 500 });
  if (!exists) return NextResponse.json({ message: "Table tidak ditemukan" }, { status: 404 });

  // Read-only preview
  const query = admin.from(table as any).select("*").range(offset, offset + limit - 1);
  const { data, error } = await query;
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  return NextResponse.json({ table, limit, offset, rows: data ?? [] });
}

