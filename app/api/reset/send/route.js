import { supabaseServer } from "@/app/lib/supabaseServer";
import nodemailer from "nodemailer";
import crypto from "crypto";

export async function POST(req) {
  try {
    const supabase = await supabaseServer();
    const { email } = await req.json();

    // Generate token unik
    const token = crypto.randomUUID();

    // Simpan token
    await supabase.from("password_resets").insert({
      email,
      token,
      expires_at: new Date(Date.now() + 1000 * 60 * 10), // 10 menit
    });

    // Konfigurasi SMTP INKAI
    const transporter = nodemailer.createTransport({
      host: process.env.INKAI_SMTP_HOST,
      port: Number(process.env.INKAI_SMTP_PORT || 465),
      secure: true,
      auth: {
        user: process.env.INKAI_SMTP_USER,
        pass: process.env.INKAI_SMTP_PASS,
      },
    });

    // Link reset menuju halaman app
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset/password?token=${token}`;

    // Kirim email
    await transporter.sendMail({
      from: `"INKAI Support" <${process.env.INKAI_SMTP_USER}>`,
      to: email,
      subject: "Reset Password INKAI",
      html: `
        <h2>Reset Password INKAI</h2>
        <p>Klik tombol berikut untuk mereset password:</p>
        <a href="${resetUrl}"
           style="padding: 12px 20px; background: #00e5ff; 
                  color: #000; text-decoration: none; 
                  font-weight: bold; border-radius: 8px;">
            Reset Password
        </a>
        <p>Link berlaku selama <b>10 menit</b>.</p>
      `,
    });

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
