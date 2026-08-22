import { redirect } from "next/navigation";

import { RegisterForm } from "@/components/auth/register-form";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { hasSupabaseEnv } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export default async function RegisterPage() {
  if (hasSupabaseEnv) {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect("/dashboard");
    }
  }

  return (
    <main className="flex-1 py-10 sm:py-14">
      <Container className="max-w-lg">
        <Card className="space-y-4">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Criar conta</h1>
            <p className="text-sm text-zinc-600">Cadastre-se com Google ou e-mail/senha.</p>
          </div>

          {!hasSupabaseEnv ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              As variáveis de ambiente do Supabase estão ausentes.
            </p>
          ) : null}

          <RegisterForm />
        </Card>
      </Container>
    </main>
  );
}