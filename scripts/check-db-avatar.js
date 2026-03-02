/**
 * Cek DB: kolom avatar_path di profiles dan sample data.
 * Jalankan: node scripts/check-db-avatar.js
 * Pastikan .env.local punya NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY.
 */
require("dotenv").config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const { createClient } = require("@supabase/supabase-js");
const admin = createClient(url, key);

async function main() {
  console.log("=== Cek DB: profiles.avatar_path ===\n");

  // 1. Cek kolom avatar_path ada atau tidak
  const { data: cols, error: colErr } = await admin
    .from("profiles")
    .select("id")
    .limit(1);

  if (colErr) {
    console.error("Error query profiles:", colErr.message);
    return;
  }

  // 2. Ambil sample profil (id, user_id, nama, avatar_path)
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, user_id, nama, avatar_path")
    .limit(10);

  if (error) {
    console.error("Error:", error.message);
    if (error.message?.includes("avatar_path")) {
      console.log("\n>>> Kolom avatar_path TIDAK ADA di tabel profiles.");
      console.log("    Tambahkan migrasi: ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_path text;");
    }
    return;
  }

  console.log("Kolom avatar_path: OK (ada di tabel)\n");
  console.log("Sample 10 profil (id, user_id, nama, avatar_path):");
  console.log("-".repeat(100));

  for (const p of profiles || []) {
    const ap = p.avatar_path ?? "(null)";
    const status = p.avatar_path ? "✓ ada" : "✗ kosong";
    const uid = p.user_id ?? "(null)";
    const idMatch = uid === p.id ? "id=user_id" : "id≠user_id";
    console.log(`id: ${p.id?.slice(0, 8)}... | user_id: ${String(uid).slice(0, 8)}... ${idMatch} | ${p.nama ?? "-"} | avatar: ${status}`);
  }

  const withAvatar = (profiles || []).filter((p) => p.avatar_path).length;
  console.log("-".repeat(80));
  console.log(`\nTotal sample: ${profiles?.length ?? 0}, yang punya avatar_path: ${withAvatar}`);

  if (withAvatar === 0) {
    console.log("\n>>> Semua profil sample avatar_path kosong.");
    console.log("    User perlu upload foto di ProfileModal (tab Profil) dulu.");
    console.log("    Upload simpan path ke profiles.avatar_path via RPC save_profile.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
