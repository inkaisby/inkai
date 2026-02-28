/**
 * Cek data ranting di Supabase (untuk debug "Tidak ditemukan" di ProfileModal step 3).
 * Jalankan: node scripts/check-ranting-db.js
 * Pastikan .env.local sudah ada NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY.
 */

require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: ".env" });

const { createClient } = require("@supabase/supabase-js");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key);

async function main() {
  console.log("=== RANTING (semua) ===\n");

  const { data: allRanting, error: e1 } = await admin
    .from("ranting")
    .select("id, nama, province_id, regency_id, district_id")
    .order("nama");

  if (e1) {
    console.error("Error:", e1.message);
    return;
  }

  console.log("Total ranting:", allRanting?.length ?? 0);
  console.log(
    "\nContoh (10 pertama):\n",
    allRanting?.slice(0, 10).map((r) => ({
      nama: r.nama,
      province_id: r.province_id,
      regency_id: r.regency_id,
      district_id: r.district_id,
    }))
  );

  // Jawa Timur=35, Kota Surabaya=3578, Bulak=357805
  const provinceId = 35;
  const regencyId = 3578;
  const districtId = 357805;

  console.log("\n=== Filter wilayah (Jawa Timur, Surabaya, Bulak) ===\n");
  console.log("province_id=35, regency_id=3578, district_id=357805\n");

  const { data: filtered, error: e2 } = await admin
    .from("ranting")
    .select("id, nama, province_id, regency_id, district_id")
    .eq("province_id", provinceId)
    .or(`regency_id.eq.${regencyId},regency_id.is.null`)
    .or(`district_id.eq.${districtId},district_id.is.null`)
    .order("nama");

  if (e2) {
    console.error("Error filter:", e2.message);
    return;
  }

  console.log("Hasil filter:", filtered?.length ?? 0);
  if (filtered?.length) {
    console.log(filtered);
  } else {
    console.log("(kosong - tidak ada ranting yang match)");
  }

  // Ranting dengan province_id=35 saja (Jawa Timur)
  const { data: byProvince } = await admin
    .from("ranting")
    .select("id, nama, province_id, regency_id, district_id")
    .eq("province_id", provinceId)
    .order("nama");

  console.log("\n=== Ranting di Jawa Timur (province_id=35) ===\n");
  console.log("Jumlah:", byProvince?.length ?? 0);
  if (byProvince?.length) {
    console.log(byProvince.slice(0, 15));
  }
}

main().catch(console.error);
