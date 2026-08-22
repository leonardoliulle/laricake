import { createBrowserClient } from "@supabase/ssr";
import { type SupabaseClient } from "@supabase/supabase-js";

import { env, hasSupabaseEnv } from "@/lib/env";

let browserClient: SupabaseClient | undefined;

export function createBrowserSupabaseClient() {
  if (!hasSupabaseEnv) {
    throw new Error(
      "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }

  if (browserClient) {
    return browserClient;
  }

  browserClient = createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );

  return browserClient;
}