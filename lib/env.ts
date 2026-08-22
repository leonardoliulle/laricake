export const env = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
};

export const hasSupabaseEnv =
  Boolean(env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
