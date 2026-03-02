import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";
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

  const nama = data?.nama ?? "";
  const userId = data?.user_id ?? "";
  const rantingNama = (data?.ranting as { nama?: string } | null)?.nama ?? "";

  const doc = new jsPDF({ format: "a6", unit: "mm" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(nama, 10, 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(userId, 10, 25);
  doc.text(`Ranting: ${rantingNama}`, 10, 35);

  const pdfBuffer = doc.output("arraybuffer");
  const pdfBytes = new Uint8Array(pdfBuffer);

  return new NextResponse(pdfBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=kartu-anggota.pdf",
    },
  });
}
