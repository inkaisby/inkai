import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { isValidUuid } from "@/app/lib/security/validateUuid";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Normalisasi ke digit untuk wa.me (62xxxxxxxxxx) */
function toWaDigits(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  let d = raw.replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("62")) return d.length >= 11 ? d : null;
  if (d.startsWith("0")) d = "62" + d.slice(1);
  else if (d.length >= 9 && d.length <= 12 && !d.startsWith("62")) d = "62" + d;
  return d.length >= 11 && d.length <= 15 ? d : null;
}

export type SellerContactRow = {
  seller_key: string;
  seller_name: string;
  wa_digits: string | null;
  product_ids: string[];
  product_titles: string[];
};

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const idsParam = req.nextUrl.searchParams.get("ids") ?? "";
  const ids = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter((id) => isValidUuid(id))
    .slice(0, 40);

  if (ids.length === 0) {
    return NextResponse.json({ contacts: [], fallback_wa: null });
  }

  const fallbackWa = toWaDigits(process.env.NEXT_PUBLIC_MARKETPLACE_TOKO_WA ?? process.env.MARKETPLACE_TOKO_WA ?? "");

  const admin = createSupabaseAdminClient();
  const { data: rows, error } = await admin
    .from("home_marketplace")
    .select("id, title, created_by")
    .in("id", ids);

  if (error) {
    console.error("[seller-contacts]", error);
    return NextResponse.json({ message: "Gagal memuat kontak" }, { status: 500 });
  }

  const list = (rows ?? []) as { id: string; title: string; created_by: string | null }[];
  const userIds = [...new Set(list.map((r) => r.created_by).filter(Boolean))] as string[];

  const waByUser = new Map<string, string | null>();
  const nameByUser = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profs } = await admin
      .from("profiles")
      .select("user_id, nama, telepon, telepon_verified_e164")
      .in("user_id", userIds);

    for (const p of profs ?? []) {
      const row = p as {
        user_id: string;
        nama?: string | null;
        telepon?: string | null;
        telepon_verified_e164?: string | null;
      };
      const wa =
        toWaDigits(row.telepon_verified_e164) ?? toWaDigits(row.telepon ?? "");
      waByUser.set(row.user_id, wa);
      nameByUser.set(row.user_id, row.nama?.trim() || "Penjual");
    }
  }

  const groupMap = new Map<
    string,
    { titles: string[]; ids: string[]; created_by: string | null }
  >();
  for (const r of list) {
    const key = r.created_by ?? "__no_owner__";
    const g = groupMap.get(key) ?? { titles: [], ids: [], created_by: r.created_by };
    g.titles.push(r.title || "Produk");
    g.ids.push(r.id);
    groupMap.set(key, g);
  }

  const contacts: SellerContactRow[] = [];
  for (const [key, g] of groupMap) {
    const uid = g.created_by;
    let wa: string | null = null;
    let name = "Administrasi toko";
    if (uid) {
      wa = waByUser.get(uid) ?? null;
      name = nameByUser.get(uid) || "Penjual";
    }
    if (!wa) wa = fallbackWa;
    contacts.push({
      seller_key: key,
      seller_name: name,
      wa_digits: wa,
      product_ids: g.ids,
      product_titles: g.titles,
    });
  }

  return NextResponse.json({
    contacts,
    fallback_wa: fallbackWa,
  });
}
