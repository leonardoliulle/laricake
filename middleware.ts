import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { env, hasSupabaseEnv } from "@/lib/env";

function applySetCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie.name, cookie.value, cookie);
  });
}

export async function middleware(request: NextRequest) {
  if (!hasSupabaseEnv) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isAdminDashboardRoute = pathname.startsWith("/dashboard/admin");

  const roleCandidates: unknown[] = [
    user?.user_metadata?.role,
    user?.app_metadata?.role,
    user?.user_metadata?.roles,
    user?.app_metadata?.roles,
  ];

  const hasAdminRole = roleCandidates.some((candidate) => {
    if (typeof candidate === "string") {
      return candidate.trim().toLowerCase() === "admin";
    }

    if (Array.isArray(candidate)) {
      return candidate.some(
        (value) => typeof value === "string" && value.trim().toLowerCase() === "admin"
      );
    }

    return false;
  });

  const isAdmin =
    hasAdminRole ||
    user?.user_metadata?.is_admin === true ||
    user?.app_metadata?.is_admin === true;

  if (!user && isDashboardRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);

    const redirectResponse = NextResponse.redirect(loginUrl);
    applySetCookies(response, redirectResponse);
    return redirectResponse;
  }

  if (user && isAuthPage) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";

    const redirectResponse = NextResponse.redirect(dashboardUrl);
    applySetCookies(response, redirectResponse);
    return redirectResponse;
  }

  if (user && isAdminDashboardRoute && !isAdmin) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";

    const redirectResponse = NextResponse.redirect(dashboardUrl);
    applySetCookies(response, redirectResponse);
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register"],
};