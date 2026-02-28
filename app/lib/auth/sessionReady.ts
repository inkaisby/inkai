import { supabaseBrowser as supabase } from "@/app/lib/supabaseBrowser";


export async function waitForSessionReady(
  maxRetry: number = 10,
  delayMs: number = 150
) {

  for (let i = 0; i < maxRetry; i++) {
    const { data, error } = await supabase.auth.getSession();

    // ❗ JANGAN throw — Supabase kadang belum siap
    if (data?.session?.user) {
      return data.session;
    }

    await new Promise(res => setTimeout(res, delayMs));
  }

  return null; // ⬅️ Google-style: silent fail, bukan crash
}
