import { NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getSessionUser } from "@/app/lib/supabase/session";
import { requireSuperadmin } from "@/app/lib/security/requireSuperadmin";

export const runtime = "nodejs";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const me = await getSessionUser();
  if (!me) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // User hanya boleh cetak PDF miliknya, kecuali superadmin.
  if (me.id !== id) {
    const gate = await requireSuperadmin(me);
    if (!gate.ok) {
      return NextResponse.json({ message: "Forbidden" }, { status: gate.status });
    }
  }

  const supabase = createSupabaseAdminClient();

  const { data } = await supabase
    .from("profiles")
    .select(`nama, user_id, ranting:ranting_id ( nama )`)
    .eq("user_id", id)
    .single();

  const html = `
    <html>
      <body style="font-family:sans-serif">
        <h3>${data?.nama ?? ""}</h3>
        <p>${data?.user_id ?? ""}</p>
        <p>Ranting: ${(data?.ranting as { nama?: string } | null)?.nama ?? ""}</p>
      </body>
    </html>
  `;

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: "shell",
  });
  const page = await browser.newPage();
  await page.setContent(html);
  const pdf = await page.pdf({ format: "A6" });
  await browser.close();

  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=kartu-anggota.pdf",
    },
  });
}
