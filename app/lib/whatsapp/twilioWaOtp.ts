import "server-only";

/**
 * Kirim pesan WhatsApp via Twilio (Sandbox atau nomor bisnis resmi).
 * Env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM (mis. whatsapp:+14155238886)
 */
export async function sendTwilioWhatsAppOtp(
  toE164Digits: string,
  code: string,
  appName = "INKAI",
): Promise<{ ok: true } | { ok: false; message: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_WHATSAPP_FROM?.trim();

  if (!sid || !token || !from) {
    return {
      ok: false,
      message:
        "WhatsApp OTP belum dikonfigurasi (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM).",
    };
  }

  const to = `whatsapp:+${toE164Digits}`;
  const body = `${appName}: Kode verifikasi nomor Anda adalah ${code}. Berlaku 10 menit. Jangan berikan kepada siapa pun.`;

  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      From: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
      To: to,
      Body: body,
    }).toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    let msg = "Gagal mengirim WhatsApp";
    try {
      const j = JSON.parse(errText) as { message?: string };
      if (j.message) msg = j.message;
    } catch {
      if (errText.length < 200) msg = errText;
    }
    return { ok: false, message: msg };
  }

  return { ok: true };
}
