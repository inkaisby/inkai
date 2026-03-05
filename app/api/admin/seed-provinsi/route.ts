export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { requireSuperadmin } from "@/app/lib/security/requireSuperadmin";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";

/**
 * Daftar provinsi organisasi INKAI default + BPS province_id (untuk seed cabang dari wilayah).
 * Idempotent: skip jika nama sudah ada (unique constraint atau cek manual).
 */
const DEFAULT_PROVINSI: { nama: string; province_id: number }[] = [
  { nama: "DKI Jakarta", province_id: 31 },
  { nama: "Jawa Barat", province_id: 32 },
  { nama: "Jawa Tengah", province_id: 33 },
  { nama: "Jawa Timur", province_id: 35 },
  { nama: "Banten", province_id: 36 },
  { nama: "Bali", province_id: 51 },
  { nama: "Sumatera Utara", province_id: 12 },
  { nama: "Sumatera Barat", province_id: 13 },
  { nama: "Sumatera Selatan", province_id: 16 },
  { nama: "Lampung", province_id: 18 },
  { nama: "Kalimantan Timur", province_id: 64 },
  { nama: "Sulawesi Selatan", province_id: 73 },
  { nama: "Sulawesi Utara", province_id: 71 },
];

/**
 * POST: Isi provinsi default (organisasi INKAI). Hanya Superadmin.
 * Setelah ini bisa jalankan "Isi cabang dari wilayah" di Role Management.
 */
export async function POST() {
  try {
    const me = await getSessionUser();
    if (!me) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const gate = await requireSuperadmin(me);
    if (!gate.ok) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const admin = createSupabaseAdminClient();

    const { data: existing } = await admin
      .from("provinsi")
      .select("id, nama")
      .order("nama");
    const existingNames = new Set((existing ?? []).map((p) => (p.nama ?? "").toLowerCase().trim()));

    let inserted = 0;
    for (const row of DEFAULT_PROVINSI) {
      const key = row.nama.toLowerCase().trim();
      if (existingNames.has(key)) continue;

      const { error } = await admin
        .from("provinsi")
        .insert({
          nama: row.nama,
          aktif: true,
          province_id: row.province_id,
        });
      if (error) {
        if (error.code === "42703") {
          await admin.from("provinsi").insert({ nama: row.nama, aktif: true });
        } else {
          return NextResponse.json({ message: error.message }, { status: 500 });
        }
      }
      inserted++;
      existingNames.add(key);
    }

    return NextResponse.json({
      ok: true,
      inserted,
      total: DEFAULT_PROVINSI.length,
      message: inserted > 0 ? `Provinsi default ditambahkan: ${inserted}.` : "Provinsi sudah ada.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Seed provinsi gagal";
    console.error("[API seed-provinsi]", err);
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
