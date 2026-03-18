import { NextRequest, NextResponse } from "next/server";
import { createHmac, randomInt } from "crypto";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { checkApiRateLimit } from "@/app/lib/security/apiSecurity";
import { checkRateLimit } from "@/app/lib/security/rateLimit";
import { normalizeIndonesiaPhoneToE164Digits } from "@/app/lib/phone/indonesiaE164";
import { sendTwilioWhatsAppOtp } from "@/app/lib/whatsapp/twilioWaOtp";

export const runtime = "nodejs";

function hashOtp(phoneE164: string, code: string): string {
  const pepper =
    process.env.PHONE_OTP_PEPPER?.trim() ||
    (process.env.NODE_ENV === "development"
      ? "dev-only-phone-otp-pepper"
      : "");
  if (!pepper) {
    throw new Error("PHONE_OTP_PEPPER belum di-set");
  }
  return createHmac("sha256", pepper)
    .update(`${phoneE164}:${code}`)
    .digest("hex");
}

export async function POST(req: NextRequest) {
  const rate = checkApiRateLimit(req, "verify-phone-send", {
    max: 10,
    windowMs: 60_000,
  });
  if (rate) return rate;

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const uidKey = `wa-otp-user:${user.id}`;
  if (!checkRateLimit(uidKey, { max: 5, windowMs: 900_000 }).ok) {
    return NextResponse.json(
      {
        message:
          "Terlalu banyak permintaan kode. Coba lagi setelah 15 menit.",
      },
      { status: 429 },
    );
  }

  let body: { telepon?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Body JSON tidak valid" }, { status: 400 });
  }

  const raw = typeof body.telepon === "string" ? body.telepon.trim() : "";
  const e164 = normalizeIndonesiaPhoneToE164Digits(raw);
  if (!e164) {
    return NextResponse.json(
      { message: "Format nomor tidak valid. Gunakan nomor Indonesia (mis. 08… atau 628…)." },
      { status: 400 },
    );
  }

  const code = String(randomInt(100000, 1000000));
  let otpHash: string;
  try {
    otpHash = hashOtp(e164, code);
  } catch {
    return NextResponse.json(
      {
        message:
          "Server belum siap: set env PHONE_OTP_PEPPER (string acak panjang) untuk OTP.",
      },
      { status: 503 },
    );
  }

  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const admin = createSupabaseAdminClient();

  const { data: row, error: findErr } = await admin
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  let profileId = row?.id as string | undefined;
  if (!profileId) {
    const { data: byId } = await admin
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    profileId = byId?.id as string | undefined;
  }
  if (!profileId) {
    return NextResponse.json({ message: "Profil tidak ditemukan" }, { status: 404 });
  }

  const { error: upErr } = await admin
    .from("profiles")
    .update({
      telepon_wa_otp_hash: otpHash,
      telepon_wa_otp_expires_at: expires,
      telepon_wa_pending_e164: e164,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId);

  if (findErr) {
    console.error("[verify-phone/send] find", findErr);
    return NextResponse.json({ message: findErr.message }, { status: 500 });
  }
  if (upErr) {
    console.error("[verify-phone/send] update", upErr);
    return NextResponse.json(
      { message: upErr.message ?? "Gagal menyimpan kode" },
      { status: 500 },
    );
  }

  const wa = await sendTwilioWhatsAppOtp(e164, code);
  if (!wa.ok) {
    await admin
      .from("profiles")
      .update({
        telepon_wa_otp_hash: null,
        telepon_wa_otp_expires_at: null,
        telepon_wa_pending_e164: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profileId);
    return NextResponse.json({ message: wa.message }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    expiresInMinutes: 10,
    hint: "Periksa WhatsApp di nomor yang Anda masukkan.",
  });
}
