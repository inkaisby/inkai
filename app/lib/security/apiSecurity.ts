import "server-only";
import { NextRequest } from "next/server";
import { checkRateLimit } from "./rateLimit";

/**
 * Ambil IP client dari request (untuk rate limiting).
 * Mendukung x-forwarded-for, x-real-ip (Vercel, proxy).
 */
export function getClientIp(req: NextRequest | Request): string {
  const headers = req.headers;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

/**
 * Cek rate limit untuk API. Return Response 429 jika melebihi batas, null jika OK.
 * Key = prefix + IP.
 */
export function checkApiRateLimit(
  req: NextRequest | Request,
  prefix: string,
  options?: { max?: number; windowMs?: number },
): Response | null {
  const ip = getClientIp(req);
  const key = `${prefix}:${ip}`;
  const result = checkRateLimit(key, options ?? { max: 60, windowMs: 60_000 });
  if (result.ok) return null;
  return new Response(
    JSON.stringify({ message: "Terlalu banyak request. Coba lagi nanti." }),
    { status: 429, headers: { "Content-Type": "application/json" } },
  );
}

