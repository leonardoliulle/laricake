"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { hasSupabaseEnv } from "@/lib/env";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";

export function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    if (!hasSupabaseEnv) {
      router.replace("/login");
      return;
    }

    setIsLoading(true);

    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
    setIsLoading(false);
  }

  return (
    <Button onClick={handleLogout} disabled={isLoading}>
      {isLoading ? "Signing out..." : "Logout"}
    </Button>
  );
}