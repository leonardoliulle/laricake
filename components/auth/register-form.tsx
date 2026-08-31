"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { hasSupabaseEnv } from "@/lib/env";
import { getSupabaseOAuthErrorMessage } from "@/lib/supabase-auth-errors";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";

function getOAuthRedirectUrl() {
  return `${window.location.origin}/auth/callback`;
}

export function RegisterForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleGoogleSignIn() {
    if (!hasSupabaseEnv) {
      setErrorMessage("As variáveis de ambiente do Supabase estão ausentes.");
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    const supabase = createBrowserSupabaseClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getOAuthRedirectUrl(),
      },
    });

    if (error) {
      setErrorMessage(getSupabaseOAuthErrorMessage(error.message));
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        if (!hasSupabaseEnv) {
          setErrorMessage("As variáveis de ambiente do Supabase estão ausentes.");
          return;
        }

    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage("Por favor, informe seu e-mail.");
      return;
    }

    const normalizedWhatsappNumber = whatsappNumber.replace(/\s+/g, "").trim();

    if (!normalizedWhatsappNumber) {
      setErrorMessage("Por favor, informe seu WhatsApp.");
      return;
    }

    if (!/^\+?[0-9]{10,15}$/.test(normalizedWhatsappNumber)) {
      setErrorMessage("Informe um número de WhatsApp válido.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Senha e confirmação não coincidem.");
      return;
    }

    setIsLoading(true);

    const supabase = createBrowserSupabaseClient();

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          whatsapp_number: normalizedWhatsappNumber,
        },
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
      return;
    }

    if (data.session) {
      router.replace("/dashboard");
      router.refresh();
      return;
    }

    setSuccessMessage("Conta criada. Verifique seu e-mail para confirmar a conta.");
    setIsLoading(false);
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {errorMessage ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {successMessage}
        </p>
      ) : null}

      {/* <Button
        className="w-full"
        variant="secondary"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
      >
        Continuar com Google
      </Button> */}

      <div className="h-px w-full bg-zinc-200" />

      <label className="block space-y-1">
        <span className="text-sm font-medium text-zinc-700">E-mail</span>
        <input
          type="email"
          autoComplete="email"
          className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-500"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={isLoading}
          required
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-zinc-700">WhatsApp</span>
        <input
          type="tel"
          autoComplete="tel"
          className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-500"
          value={whatsappNumber}
          onChange={(event) => setWhatsappNumber(event.target.value)}
          disabled={isLoading}
          required
          placeholder="Ex: 5511999999999"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-zinc-700">Senha</span>
        <input
          type="password"
          autoComplete="new-password"
          className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-500"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={isLoading}
          required
          minLength={6}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-zinc-700">Confirmar senha</span>
        <input
          type="password"
          autoComplete="new-password"
          className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-500"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          disabled={isLoading}
          required
          minLength={6}
        />
      </label>

      <Button className="w-full" type="submit" disabled={isLoading}>
        {isLoading ? "Criando conta..." : "Criar conta"}
      </Button>

      <p className="text-sm text-zinc-700">
        Já tem uma conta?{" "}
        <Link className="underline-offset-2 hover:underline" href="/login">
          Entrar
        </Link>
      </p>
    </form>
  );
}