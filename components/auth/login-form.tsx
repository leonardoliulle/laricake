"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { hasSupabaseEnv } from "@/lib/env";
import { getSupabaseOAuthErrorMessage } from "@/lib/supabase-auth-errors";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";

type AuthMode = "login" | "register";

type LoginFormProps = {
  callbackError?: string | null;
  nextPath?: string;
};

function getOAuthRedirectUrl(mode: AuthMode, nextPath?: string) {
  const url = new URL(`${window.location.origin}/auth/callback`);

  if (mode === "login" && nextPath?.startsWith("/")) {
    url.searchParams.set("next", nextPath);
  }

  return url.toString();
}

export function LoginForm({ callbackError, nextPath }: LoginFormProps) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const safeNextPath = nextPath?.startsWith("/") ? nextPath : "/dashboard";

  async function handleGoogleSignIn() {
    if (!hasSupabaseEnv) {
      setErrorMessage("As variáveis de ambiente do Supabase estão ausentes.");
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    const supabase = createBrowserSupabaseClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getOAuthRedirectUrl("login", safeNextPath),
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

    if (!email.trim()) {
      setErrorMessage("Por favor, informe seu e-mail.");
      return;
    }

    if (!password) {
      setErrorMessage("Por favor, informe sua senha.");
      return;
    }

    setIsLoading(true);

    const supabase = createBrowserSupabaseClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
      return;
    }

    router.replace(safeNextPath);
    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {callbackError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {callbackError}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <Button
        className="w-full"
        variant="secondary"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
      >
        Continuar com Google
      </Button>

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
        <span className="text-sm font-medium text-zinc-700">Senha</span>
        <input
          type="password"
          autoComplete="current-password"
          className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-500"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={isLoading}
          required
        />
      </label>

      <Button className="w-full" type="submit" disabled={isLoading}>
        {isLoading ? "Entrando..." : "Entrar"}
      </Button>

      <div className="flex items-center justify-between text-sm">
        <Link className="text-zinc-700 underline-offset-2 hover:underline" href="/register">
          Criar conta
        </Link>
        <Link
          className="text-zinc-700 underline-offset-2 hover:underline"
          href="/forgot-password"
        >
          Esqueceu a senha?
        </Link>
      </div>
    </form>
  );
}