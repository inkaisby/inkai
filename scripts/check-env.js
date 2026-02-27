/**
 * Run only on Vercel. Fail build if Supabase public env vars are missing,
 * so NEXT_PUBLIC_* get inlined correctly at build time.
 */
if (process.env.VERCEL === "1") {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error("");
    console.error("ERROR: Supabase env vars missing on Vercel.");
    console.error("Add in Vercel → Project → Settings → Environment Variables:");
    console.error("  - NEXT_PUBLIC_SUPABASE_URL");
    console.error("  - NEXT_PUBLIC_SUPABASE_ANON_KEY");
    console.error("Enable for 'Production', then Redeploy (without cache).");
    console.error("");
    process.exit(1);
  }
  console.log("Supabase env OK for build");
}
