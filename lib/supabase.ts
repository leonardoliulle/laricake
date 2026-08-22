import { createClient } from "@supabase/supabase-js";

import { env, hasSupabaseEnv } from "@/lib/env";

export function createSupabaseClient() {
  if (!hasSupabaseEnv) {
    throw new Error(
      "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
