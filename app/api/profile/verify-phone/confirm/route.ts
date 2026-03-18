import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { checkApiRateLimit } from "@/app/lib/security/apiSecurity";
import { normalizeIndonesiaPhoneToE164Digits } from "@/app/lib/phone/indonesiaE164";

export const runtime = "nodejs";

function hashOtp(phoneE164: string, code: string): string {
  const pepper =
    process.env.PHONE_OTP_PEPPER?.trim() ||
    (process.env.NODE_ENV === "development"
      ? "dev-only-phone-otp-pepper"
      : "");
  if (!pepper) throw new Error("PHONE_OTP_PEPPER");
  return createHmac("sha256", pepper)
    .update(`${phoneE164}:${code}`)
    .digest("hex");
}

type OtpRow = {
  id: string;
  telepon_wa_otp_hash: string | null;
  telepon_wa_otp_expires_at: string | null;
  telepon_wa_pending_e164: string | null;
};

export async function POST(req: NextRequest) {
  const rate = checkApiRateLimit(req, "verify-phone-confirm", {
    max: 30,
    windowMs: 60_000,
  });
  if (rate) return rate;

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: { telepon?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Body JSON tidak valid" }, { status: 400 });
  }

  const raw = typeof body.telepon === "string" ? body.telepon.trim() : "";
  const code = typeof body.code === "string" ? body.code.replace(/\D/g, "") : "";
  const e164 = normalizeIndonesiaPhoneToE164Digits(raw);

  if (!e164 || code.length !== 6) {
    return NextResponse.json(
      { message: "Nomor atau kode tidak valid (kode 6 digit)." },
      { status: 400 },
    );
  }

  const admin = createSupabaseAdminClient();
  const sel =
    "id, telepon_wa_otp_hash, telepon_wa_otp_expires_at, telepon_wa_pending_e164";

  let { data: row } = await admin
    .from("profiles")
    .select(sel)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!row) {
    const r2 = await admin.from("profiles").select(sel).eq("id", user.id).maybeSingle();
    row = r2.data;
  }

  const r = row as OtpRow | null;
  if (!r?.id) {
    return NextResponse.json({ message: "Profil tidak ditemukan" }, { status: 404 });
  }

  if (
    !r.telepon_wa_otp_hash ||
    !r.telepon_wa_otp_expires_at ||
    !r.telepon_wa_pending_e164
  ) {
    return NextResponse.json(
      { message: "Belum ada kode aktif. Minta kode baru dari WhatsApp." },
      { status: 400 },
    );
  }

  if (r.telepon_wa_pending_e164 !== e164) {
    return NextResponse.json(
      { message: "Nomor tidak cocok dengan kode yang dikirim." },
      { status: 400 },
    );
  }

  if (new Date(r.telepon_wa_otp_expires_at).getTime() < Date.now()) {
    return NextResponse.json(
      { message: "Kode sudah kadaluarsa. Minta kode baru." },
      { status: 400 },
    );
  }

  let expectedHash: string;
  try {
    expectedHash = hashOtp(e164, code);
  } catch {
    return NextResponse.json({ message: "Konfigurasi server tidak lengkap" }, { status: 503 });
  }

  if (expectedHash !== r.telepon_wa_otp_hash) {
    return NextResponse.json({ message: "Kode salah." }, { status: 400 });
  }

  const teleponDigits = `0${e164.slice(2)}`.replace(/\D/g, "").slice(0, 15);

  const { error: upErr } = await admin
    .from("profiles")
    .update({
      telepon: teleponDigits,
      telepon_verified_at: new Date().toISOString(),
      telepon_verified_e164: e164,
      telepon_wa_otp_hash: null,
      telepon_wa_otp_expires_at: null,
      telepon_wa_pending_e164: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", r.id);

  if (upErr) {
    console.error("[verify-phone/confirm]", upErr);
    return NextResponse.json({ message: upErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, telepon_verified_e164: e164 });
}
