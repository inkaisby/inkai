/**
 * GET: Ambil layout dashboard user (urutan KPI, section).
 * PUT: Simpan layout dashboard (drag-and-drop). Body: { kpiOrder?: string[], sectionOrder?: string[] }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_KPI_ORDER = [
  "ranting",
  "anggota",
  "ujian",
  "event",
  "kwitansi",
] as const;

export type DashboardLayoutPayload = {
  kpiOrder?: string[];
  sectionOrder?: string[];
};

function isValidKpiOrder(arr: unknown): arr is string[] {
  return (
    Array.isArray(arr) &&
    arr.every((x) => typeof x === "string" && x.length > 0) &&
    arr.length <= 20
  );
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("dashboard_layout")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { message: error.message, code: error.code },
      { status: 500 }
    );
  }

  const raw = (data?.dashboard_layout ?? null) as DashboardLayoutPayload | null;
  const layout: DashboardLayoutPayload = {
    kpiOrder:
      raw?.kpiOrder && isValidKpiOrder(raw.kpiOrder)
        ? raw.kpiOrder
        : [...DEFAULT_KPI_ORDER],
    sectionOrder:
      Array.isArray(raw?.sectionOrder) && raw.sectionOrder.length > 0
        ? raw.sectionOrder
        : undefined,
  };

  return NextResponse.json(layout);
}

export async function PUT(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: DashboardLayoutPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { message: "Body harus JSON valid" },
      { status: 400 }
    );
  }

  const payload: DashboardLayoutPayload = {};
  if (body.kpiOrder !== undefined) {
    if (!isValidKpiOrder(body.kpiOrder)) {
      return NextResponse.json(
        { message: "kpiOrder harus array string (maks 20 item)" },
        { status: 400 }
      );
    }
    payload.kpiOrder = body.kpiOrder;
  }
  if (body.sectionOrder !== undefined) {
    if (
      !Array.isArray(body.sectionOrder) ||
      body.sectionOrder.some((x) => typeof x !== "string")
    ) {
      return NextResponse.json(
        { message: "sectionOrder harus array string" },
        { status: 400 }
      );
    }
    payload.sectionOrder = body.sectionOrder;
  }

  if (Object.keys(payload).length === 0) {
    return NextResponse.json(
      { message: "Berikan kpiOrder dan/atau sectionOrder" },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdminClient();

  const { data: existing } = await admin
    .from("profiles")
    .select("dashboard_layout")
    .eq("user_id", user.id)
    .maybeSingle();

  const merged: DashboardLayoutPayload = {
    ...((existing?.dashboard_layout as DashboardLayoutPayload) ?? {}),
    ...payload,
  };

  const { error } = await admin
    .from("profiles")
    .update({ dashboard_layout: merged })
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { message: error.message, code: error.code },
      { status: 500 }
    );
  }

  return NextResponse.json(merged);
}
