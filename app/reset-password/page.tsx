import { redirect } from "next/navigation";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { hasSupabaseEnv } from "@/lib/env";

export default async function ResetPasswordPage() {
  if (!hasSupabaseEnv) {
    redirect("/login");
  }

  return (
    <main className="flex-1 py-10 sm:py-14">
      <Container className="max-w-lg">
        <Card className="space-y-4">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Redefinir senha</h1>
            <p className="text-sm text-zinc-600">Defina uma nova senha para sua conta.</p>
          </div>

          <ResetPasswordForm />
        </Card>
      </Container>
    </main>
  );
}