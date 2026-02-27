import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { checkRateLimit } from "@/app/lib/security/rateLimit";

/** GET /api/profile/check-nik?nik=1234567890123456 — cek apakah NIK sudah dipakai profil lain (selain user saat ini). */
export async function GET(req: Request) {
  try {
    const ip =
      req.headers.get("x-forwarded-for") ??
      req.headers.get("x-real-ip") ??
      "unknown";

    const rl = checkRateLimit(`check-nik:${ip}`, { max: 30, windowMs: 60_000 });
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan, coba lagi sebentar lagi" },
        { status: 429 },
      );
    }

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const nik = new URL(req.url).searchParams.get("nik")?.trim() ?? "";
    if (!/^\d{16}$/.test(nik)) {
      return NextResponse.json(
        { error: "NIK harus 16 digit angka" },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("nik", nik)
      .neq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      exists: !!existing,
    });
  } catch (e) {
    console.error("[check-nik]", e);
    return NextResponse.json(
      { error: "Gagal memeriksa NIK" },
      { status: 500 }
    );
  }
}
