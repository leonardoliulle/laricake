import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { hasSupabaseEnv } from "@/lib/env";

export default function ForgotPasswordPage() {
  return (
    <main className="flex-1 py-10 sm:py-14">
      <Container className="max-w-lg">
        <Card className="space-y-4">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Esqueceu a senha</h1>
            <p className="text-sm text-zinc-600">
              Informe seu e-mail e enviaremos um link para redefinir sua senha.
            </p>
          </div>

          {!hasSupabaseEnv ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              As variáveis de ambiente do Supabase estão ausentes.
            </p>
          ) : null}

          <ForgotPasswordForm />
        </Card>
      </Container>
    </main>
  );
}