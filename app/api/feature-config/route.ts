export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getFeatureConfig } from "@/app/lib/featureConfig";
import { requireSuperadmin } from "@/app/lib/security/requireSuperadmin";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const gate = await requireSuperadmin(user);
  if (!gate.ok) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const config = await getFeatureConfig();
  return NextResponse.json(config);
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  const gate = await requireSuperadmin(user);
  if (!gate.ok) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid JSON" },
      { status: 400 },
    );
  }

  const admin = createSupabaseAdminClient();
  const allowedKeys = [
    "homebase.min_level_create_ranting",
    "homebase.min_level_delete_ranting",
    "homebase.roles_keanggotaan_block",
    "homebase.roles_event_block",
    "homebase.roles_kwitansi_block",
  ];

  for (const [key, value] of Object.entries(body)) {
    if (!allowedKeys.includes(key) || typeof value !== "string") continue;
    await admin
      .from("app_feature_config")
      .upsert(
        { key, value, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
  }

  const config = await getFeatureConfig();
  return NextResponse.json(config);
}
