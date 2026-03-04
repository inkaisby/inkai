import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  // Security headers (anti XSS, clickjacking, MIME sniffing)
  res.headers.set("X-Frame-Options", "DENY");
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
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

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

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
