import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/** True when Auth cannot reach Supabase (mis. supabase belum jalan, URL salah, offline). */
function isSupabaseUnreachableAuthError(err: unknown): boolean {
  if (err == null) return false;
  const message =
    err instanceof Error
      ? err.message
      : typeof err === "object" &&
          err !== null &&
          "message" in err &&
          typeof (err as { message: unknown }).message === "string"
        ? (err as { message: string }).message
        : String(err);
  const lower = message.toLowerCase();
  if (
    lower.includes("fetch failed") ||
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("econnrefused") ||
    lower.includes("enotfound") ||
    lower.includes("etimedout")
  ) {
    return true;
  }
  const cause = err instanceof Error ? err.cause : undefined;
  if (cause != null) return isSupabaseUnreachableAuthError(cause);
  return false;
}

/** Hapus cookie sesi Supabase SSR agar refresh token tidak di-retry terus jika host Auth mati. */
function clearSupabaseAuthCookies(req: NextRequest, res: NextResponse) {
  for (const { name } of req.cookies.getAll()) {
    if (name.startsWith("sb-")) {
      res.cookies.set(name, "", { path: "/", maxAge: 0 });
    }
  }
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: req });

  // Security headers (anti XSS, MIME sniffing)
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-XSS-Protection", "1; mode=block");

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const opts = { ...options, path: "/" };
            res.cookies.set(name, value, opts);
            req.cookies.set(name, value);
          });
        },
      },
    }
  );

  // getUser() memvalidasi JWT dan memicu refresh token; getSession() tidak.
  let user: Awaited<
    ReturnType<typeof supabase.auth.getUser>
  >["data"]["user"] = null;
  let authError: Awaited<ReturnType<typeof supabase.auth.getUser>>["error"] =
    null;

  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
    authError = result.error;
  } catch (e) {
    if (isSupabaseUnreachableAuthError(e)) {
      clearSupabaseAuthCookies(req, res);
      user = null;
      authError = null;
    } else {
      throw e;
    }
  }

  if (authError && isSupabaseUnreachableAuthError(authError)) {
    clearSupabaseAuthCookies(req, res);
    user = null;
    authError = null;
  }

  // Invalid/expired refresh token: clear session agar tidak loop error
  const isRefreshTokenError =
    authError?.message?.includes("Refresh Token") ||
    authError?.message?.includes("refresh_token") ||
    authError?.message?.toLowerCase().includes("refresh token not found");
  if (authError && isRefreshTokenError) {
    await supabase.auth.signOut();
    if (req.nextUrl.pathname.startsWith("/dashboard")) {
      const loginUrl = new URL("/", req.url);
      loginUrl.searchParams.set("returnTo", req.nextUrl.pathname);
      const redirectRes = NextResponse.redirect(loginUrl);
      res.cookies.getAll().forEach(({ name, value }) => {
        redirectRes.cookies.set(name, value, { path: "/" });
      });
      return redirectRes;
    }
    return res;
  }

  if (!user && req.nextUrl.pathname.startsWith("/dashboard")) {
    const loginUrl = new URL("/", req.url);
    loginUrl.searchParams.set("returnTo", req.nextUrl.pathname);
    const redirectRes = NextResponse.redirect(loginUrl);
    res.cookies.getAll().forEach(({ name, value }) => {
      redirectRes.cookies.set(name, value, { path: "/" });
    });
    return redirectRes;
  }

  // Soft-delete/disable akun (Settings → user deleted_at).
  // Tujuannya agar meskipun user masih bisa login, akses aplikasi akan ditolak.
  if (user) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("deleted_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile?.deleted_at) {
        await supabase.auth.signOut();

        // Mirror cookies from `res` into the response we're returning.
        const cookieCopy = (targetRes: NextResponse) => {
          res.cookies.getAll().forEach(({ name, value }) => {
            targetRes.cookies.set(name, value, { path: "/" });
          });
        };

        if (req.nextUrl.pathname.startsWith("/dashboard")) {
          const loginUrl = new URL("/", req.url);
          loginUrl.searchParams.set("returnTo", req.nextUrl.pathname);
          const redirectRes = NextResponse.redirect(loginUrl);
          cookieCopy(redirectRes);
          return redirectRes;
        }

        const jsonRes = NextResponse.json(
          { message: "Account disabled" },
          { status: 401 }
        );
        cookieCopy(jsonRes);
        return jsonRes;
      }
    } catch {
      // If profile check fails, don't block the request.
    }
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
