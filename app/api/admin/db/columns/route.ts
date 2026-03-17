export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { requireSuperadmin } from "@/app/lib/security/requireSuperadmin";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const gate = await requireSuperadmin(me);
  if (!gate.ok) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const table = new URL(req.url).searchParams.get("table")?.trim() ?? "";
  if (!table) return NextResponse.json({ message: "table is required" }, { status: 400 });

  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("information_schema.columns")
    .select("column_name,data_type,is_nullable,ordinal_position")
    .eq("table_schema", "public")
    .eq("table_name", table)
    .order("ordinal_position", { ascending: true });

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  return NextResponse.json({
    table,
    columns: (data ?? []).map((c: any) => ({
      name: c.column_name as string,
      type: c.data_type as string,
      nullable: c.is_nullable as string,
      ordinal: c.ordinal_position as number,
    })),
  });
}

