export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { requireSuperadmin } from "@/app/lib/security/requireSuperadmin";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const gate = await requireSuperadmin(me);
  if (!gate.ok) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const admin = createSupabaseAdminClient();

  // Use information_schema to enumerate public tables
  const { data, error } = await admin
    .from("information_schema.tables")
    .select("table_name")
    .eq("table_schema", "public")
    .in("table_type", ["BASE TABLE", "VIEW"])
    .order("table_name", { ascending: true });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const tables = (data ?? [])
    .map((r: { table_name?: string | null }) => r.table_name)
    .filter((t: string | null | undefined): t is string => !!t);

  return NextResponse.json({ tables });
}

