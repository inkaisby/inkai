/**
 * Run only on Vercel. Fail build if Supabase public env vars are missing,
 * so NEXT_PUBLIC_* get inlined correctly at build time.
 */
if (process.env.VERCEL === "1") {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const projectName = process.env.VERCEL_PROJECT_NAME || "(this project)";
  const vercelEnv = process.env.VERCEL_ENV || "(unknown)";
  const gitRef = process.env.VERCEL_GIT_COMMIT_REF || "(unknown)";
  const gitSha = process.env.VERCEL_GIT_COMMIT_SHA || "(unknown)";

  const missing = [];
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!key) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (missing.length > 0) {
    console.error("");
    console.error("ERROR: Supabase env vars missing on Vercel.");
    console.error("Build is running for project:", projectName);
    console.error("VERCEL_ENV:", vercelEnv);
    console.error("GIT_REF:", gitRef);
    console.error("GIT_SHA:", gitSha);
    console.error("Missing:", missing.join(", "));
    console.error("");
    console.error("PENTING: Pastikan env vars ditambahkan di PROJECT ini, bukan di Team.");
    console.error("1. Vercel Dashboard → klik nama project '" + projectName + "' (bukan nama Team)");
    console.error("2. Settings → Environment Variables");
    console.error("3. Tambah NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY");
    console.error(
      "4. Centang environment yang sesuai dengan VERCEL_ENV di atas (biasanya Production & Preview)."
    );
    console.error("   Jika pakai Team vars, isi 'Link to Projects' dengan project ini.");
    console.error("5. Save → Deployments → Redeploy (tanpa cache)");
    console.error("");
    process.exit(1);
  }
  console.log("Supabase env OK for build (project:", projectName + ")");
}
