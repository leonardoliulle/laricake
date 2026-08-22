import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { hasSupabaseEnv } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export default async function DashboardPage() {
  if (!hasSupabaseEnv) {
    redirect("/login");
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="flex-1 py-10 sm:py-14">
      <Container className="max-w-lg">
        <Card className="space-y-4">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-zinc-600">Authenticated user</p>
          </div>

          <p className="text-sm text-zinc-800">
            Signed in as <span className="font-medium">{user.email ?? "unknown"}</span>
          </p>

          <LogoutButton />
        </Card>
      </Container>
    </main>
  );
}