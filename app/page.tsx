import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { env } from "@/lib/env";

export default function Home() {
  const hasSupabaseConfig =
    Boolean(env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

  return (
    <main className="flex-1 py-10 sm:py-14">
      <Container className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-500">Phase 1 Foundation</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Next.js + Supabase starter
          </h1>
          <p className="max-w-xl text-sm text-zinc-600 sm:text-base">
            Mobile-first base with TypeScript, Tailwind CSS, and a Supabase
            client ready for production use on Vercel.
          </p>
        </div>

        <Card>
          <h2 className="text-sm font-semibold text-zinc-900">Status</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Supabase environment variables: {" "}
            <span className="font-medium text-zinc-900">
              {hasSupabaseConfig ? "configured" : "missing"}
            </span>
          </p>
        </Card>
      </Container>
    </main>
  );
}
