import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function firstIpFromForwardedFor(v: string | null): string | null {
  if (!v) return null;
  const first = v.split(",")[0]?.trim();
  return first || null;
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const xf = req.headers.get("x-forwarded-for");
  const ip =
    firstIpFromForwardedFor(xf) ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-vercel-forwarded-for") ||
    null;

  const vercel = {
    country: req.headers.get("x-vercel-ip-country"),
    region: req.headers.get("x-vercel-ip-country-region"),
    city: req.headers.get("x-vercel-ip-city"),
    latitude: req.headers.get("x-vercel-ip-latitude"),
    longitude: req.headers.get("x-vercel-ip-longitude"),
  };

  return NextResponse.json({
    ip,
    user_agent: req.headers.get("user-agent") || null,
    forwarded_for: xf || null,
    vercel,
    // Provider/ISP tidak tersedia tanpa lookup pihak ke-3 (opsional).
    provider: null,
  });
}

