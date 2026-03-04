export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { requireSuperadmin } from "@/app/lib/security/requireSuperadmin";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getRegenciesFromPackage } from "@/app/lib/wilayah-from-package";

/**
 * Mapping nama provinsi (organisasi) -> BPS province_id (wilayah)
 * Agar cabang = kabupaten/kota terisi otomatis dari data wilayah.
 */
const PROVINCE_ID_BY_NAMA: Record<string, number> = {
  "jawa timur": 35,
  "jawa barat": 32,
  "jawa tengah": 33,
  "banten": 36,
  "dki jakarta": 31,
  "bali": 51,
  "sumatera utara": 12,
  "sumatera barat": 13,
  "sumatera selatan": 16,
  "lampung": 18,
  "kalimantan timur": 64,
  "sulawesi selatan": 73,
  "sulawesi utara": 71,
};

/**
 * POST: Seed cabang dari kabupaten/kota (regency) per provinsi,
 * lalu isi ranting.cabang_id sesuai regency_id.
 * Hanya Superadmin. Cabang organisasi = satu per kabupaten/kota.
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

    console.log("[seed-cabang-wilayah] Dimulai");

    // 1. Ambil semua provinsi (id, nama, province_id)
    const { data: provinsiList, error: errProv } = await admin
      .from("provinsi")
      .select("id, nama, province_id")
      .order("nama");

    if (errProv) {
      console.error("[seed-cabang-wilayah] Gagal baca provinsi:", errProv.message);
      return NextResponse.json(
        { message: "Gagal baca provinsi: " + errProv.message },
        { status: 500 }
      );
    }
    if (!provinsiList?.length) {
      console.warn("[seed-cabang-wilayah] Belum ada data provinsi.");
      return NextResponse.json(
        { message: "Belum ada data provinsi. Tambah provinsi dulu." },
        { status: 400 }
      );
    }

    console.log("[seed-cabang-wilayah] Provinsi:", provinsiList.length, provinsiList.map((p) => ({ nama: p.nama, province_id: p.province_id })));

    let cabangCreated = 0;
    let cabangUpdated = 0;
    let rantingUpdated = 0;

    for (const prov of provinsiList) {
      let provinceId = prov.province_id as number | null;
      if (provinceId == null) {
        const key = (prov.nama ?? "").toLowerCase().trim();
        provinceId = PROVINCE_ID_BY_NAMA[key] ?? null;
        if (provinceId != null) {
          await admin
            .from("provinsi")
            .update({ province_id: provinceId })
            .eq("id", prov.id);
          console.log("[seed-cabang-wilayah] Set province_id", provinceId, "untuk provinsi", prov.nama);
        } else {
          console.log("[seed-cabang-wilayah] Skip provinsi (no province_id):", prov.nama);
        }
      }
      if (provinceId == null) continue;

      const regencies = await getRegenciesFromPackage(String(provinceId));
      console.log("[seed-cabang-wilayah] Provinsi", prov.nama, "→ kabupaten/kota:", regencies.length);
      for (const reg of regencies) {
        const regencyId = parseInt(reg.id, 10);
        if (Number.isNaN(regencyId)) continue;

        const { data: existing } = await admin
          .from("cabang")
          .select("id, nama")
          .eq("provinsi_id", prov.id)
          .eq("regency_id", regencyId)
          .maybeSingle();

        if (existing) {
          if (existing.nama !== reg.name) {
            await admin
              .from("cabang")
              .update({ nama: reg.name })
              .eq("id", existing.id);
            cabangUpdated++;
          }
        } else {
          await admin.from("cabang").insert({
            nama: reg.name,
            provinsi_id: prov.id,
            regency_id: regencyId,
            aktif: true,
          });
          cabangCreated++;
        }
      }
    }

    console.log("[seed-cabang-wilayah] Cabang: created", cabangCreated, "updated", cabangUpdated);

    // 2. Isi ranting.cabang_id dari cabang yang punya regency_id + provinsi sama
    const { data: rantingList } = await admin
      .from("ranting")
      .select("id, regency_id, province_id")
      .not("regency_id", "is", null);

    console.log("[seed-cabang-wilayah] Ranting dengan regency_id:", rantingList?.length ?? 0);

    if (rantingList?.length) {
      const { data: cabangList } = await admin
        .from("cabang")
        .select("id, regency_id, provinsi_id");
      const { data: provinsiWithBps } = await admin
        .from("provinsi")
        .select("id, province_id")
        .not("province_id", "is", null);

      const provinsiIdByBps = new Map<number, string>();
      for (const p of provinsiWithBps ?? []) {
        provinsiIdByBps.set(Number(p.province_id), p.id);
      }
      const cabangByProvinsiRegency = new Map<string, string>();
      for (const c of cabangList ?? []) {
        const pid = c.provinsi_id as string;
        const rid = Number(c.regency_id);
        if (pid && !Number.isNaN(rid)) {
          cabangByProvinsiRegency.set(`${pid}:${rid}`, c.id);
        }
      }

      for (const r of rantingList) {
        const regencyId = Number(r.regency_id);
        const provinceId = Number(r.province_id);
        if (Number.isNaN(regencyId)) continue;
        const provinsiId = provinsiIdByBps.get(provinceId);
        if (!provinsiId) continue;
        const cabangId = cabangByProvinsiRegency.get(`${provinsiId}:${regencyId}`);
        if (!cabangId) continue;
        await admin
          .from("ranting")
          .update({ cabang_id: cabangId })
          .eq("id", r.id);
        rantingUpdated++;
      }
      console.log("[seed-cabang-wilayah] Ranting di-update cabang_id:", rantingUpdated);
    }

    console.log("[seed-cabang-wilayah] Selesai. cabangCreated:", cabangCreated, "cabangUpdated:", cabangUpdated, "rantingUpdated:", rantingUpdated);

    return NextResponse.json({
      message: "Seed cabang dari kabupaten/kota selesai.",
      cabangCreated,
      cabangUpdated,
      rantingUpdated,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Seed gagal";
    console.error("[seed-cabang-wilayah] Error:", e);
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
