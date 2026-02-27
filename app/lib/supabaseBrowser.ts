import { createBrowserClient } from "@supabase/ssr";

let _instance: ReturnType<typeof createBrowserClient> | null = null;

function getBrowserClient(): ReturnType<typeof createBrowserClient> {
  if (_instance) return _instance;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "@supabase/ssr: Your project's URL and API key are required to create a Supabase client! " +
        "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  _instance = createBrowserClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return _instance;
}

/** Lazy-initialized so static prerender (e.g. /_not-found) does not require env at build time. */
export const supabaseBrowser = new Proxy(
  {} as ReturnType<typeof createBrowserClient>,
  {
    get(_, prop) {
      return (getBrowserClient() as Record<string | symbol, unknown>)[prop];
    },
  }
);
