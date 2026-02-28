/**
 * Cek tabel profiles di Supabase.
 * Jalankan: node scripts/check-profiles-db.js
 * Pastikan .env.local ada NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY.
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
  console.log("=== PROFILES (struktur & sample) ===\n");

  const { data, error } = await admin
    .from("profiles")
    .select("*")
    .limit(5);

  if (error) {
    console.error("Error:", error.message, error.code);
    return;
  }

  console.log("Jumlah baris (sample 5):", data?.length ?? 0);
  if (data?.length) {
    console.log("\nKolom:", Object.keys(data[0]).join(", "));
    console.log("\nSample:");
    data.forEach((row, i) => {
      console.log(`\n--- Row ${i + 1} ---`);
      console.log(JSON.stringify(row, null, 2));
    });
  } else {
    const { data: anyRow } = await admin.from("profiles").select("*").limit(1).maybeSingle();
    if (anyRow) {
      console.log("Kolom:", Object.keys(anyRow).join(", "));
    } else {
      console.log("Tabel kosong atau tidak ada akses.");
    }
  }
}

main().catch(console.error);
