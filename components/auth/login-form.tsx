"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { hasSupabaseEnv } from "@/lib/env";
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
      setErrorMessage("Supabase environment variables are missing.");
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
      setErrorMessage(error.message);
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        if (!hasSupabaseEnv) {
          setErrorMessage("Supabase environment variables are missing.");
          return;
        }

    event.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage("Please enter your email.");
      return;
    }

    if (!password) {
      setErrorMessage("Please enter your password.");
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
        Continue with Google
      </Button>

      <div className="h-px w-full bg-zinc-200" />

      <label className="block space-y-1">
        <span className="text-sm font-medium text-zinc-700">Email</span>
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
        <span className="text-sm font-medium text-zinc-700">Password</span>
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
        {isLoading ? "Signing in..." : "Login"}
      </Button>

      <div className="flex items-center justify-between text-sm">
        <Link className="text-zinc-700 underline-offset-2 hover:underline" href="/register">
          Create account
        </Link>
        <Link
          className="text-zinc-700 underline-offset-2 hover:underline"
          href="/forgot-password"
        >
          Forgot password?
        </Link>
      </div>
    </form>
  );
}