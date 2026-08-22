import { NextResponse } from "next/server";

import { hasSupabaseEnv } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase-server";

function getSafeNextPath(next: string | null) {
  if (!next || !next.startsWith("/")) {
    return "/dashboard";
  }

  return next;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafeNextPath(requestUrl.searchParams.get("next"));

  if (!hasSupabaseEnv) {
    return NextResponse.redirect(new URL("/login", requestUrl.origin));
  }

  if (!code) {
    const url = new URL("/login", requestUrl.origin);
    url.searchParams.set("error", "Missing authentication code.");
    return NextResponse.redirect(url);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const url = new URL("/login", requestUrl.origin);
    url.searchParams.set("error", error.message);
    return NextResponse.redirect(url);
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}