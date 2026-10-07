"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import type { AuthUser } from "@/lib/types";

export function ClientShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  useEffect(() => {
    void fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => setUser(data.user));
  }, []);
  if (!user) return <div className="p-8 text-ink/50">Loading desk…</div>;
  return <AppShell user={user}>{children}</AppShell>;
}
