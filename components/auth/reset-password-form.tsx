"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { hasSupabaseEnv } from "@/lib/env";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";

export function ResetPasswordForm() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        if (!hasSupabaseEnv) {
          setErrorMessage("Supabase environment variables are missing.");
          return;
        }

    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Password and confirmation do not match.");
      return;
    }

    setIsLoading(true);

    const supabase = createBrowserSupabaseClient();

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
      return;
    }

    setSuccessMessage("Password updated. Redirecting to dashboard...");
    router.replace("/dashboard");
    router.refresh();
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

      <label className="block space-y-1">
        <span className="text-sm font-medium text-zinc-700">New password</span>
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
        <span className="text-sm font-medium text-zinc-700">Confirm new password</span>
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
        {isLoading ? "Updating..." : "Update password"}
      </Button>
    </form>
  );
}