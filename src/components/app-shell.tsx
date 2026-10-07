"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Shield,
  Upload,
  Users,
  Video,
  BookOpen,
  Baby,
  Sparkles,
} from "lucide-react";
import type { AuthUser } from "@/lib/types";
import { can } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard, action: null },
  { href: "/sessions", label: "Sessions", icon: Video, action: "sessions.join" as const },
  { href: "/children", label: "Children", icon: Baby, action: "children.manage_own" as const },
  { href: "/people", label: "People", icon: Users, action: "users.manage" as const },
  { href: "/courses", label: "Courses", icon: BookOpen, action: "courses.manage" as const },
  { href: "/billing", label: "Billing", icon: CreditCard, action: "billing.manage" as const },
  { href: "/reports", label: "Reports", icon: ClipboardList, action: "reports.view_assigned" as const },
  { href: "/reports", label: "My reports", icon: ClipboardList, action: "reports.view_own_child" as const },
  { href: "/uploads", label: "Training videos", icon: Upload, action: "uploads.create" as const },
  { href: "/pose-templates", label: "Pose models", icon: Sparkles, action: "pose.manage" as const },
  { href: "/audit", label: "Audit log", icon: Shield, action: "audit.view" as const },
  { href: "/join", label: "Join class", icon: Video, action: "sessions.join" as const },
];

export function AppShell({
  user,
  children,
}: {
  user: AuthUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const items = NAV.filter((item) => {
    if (item.href === "/join") return user.role === "student" || user.role === "parent";
    if (item.label === "My reports") return user.role === "parent";
    if (item.label === "Reports") return user.role !== "parent";
    if (!item.action) return true;
    return can(user, item.action);
  });

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-cream">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-ink/10 bg-white px-4 py-6 md:flex">
        <Link href="/dashboard" className="px-2">
          <p className="font-serif text-2xl text-teal-900">Able Aura</p>
          <p className="text-xs font-medium text-ink/50">Online coaching</p>
        </Link>
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold",
                  active ? "bg-teal-800 text-white" : "text-ink/70 hover:bg-cream-2",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="rounded-2xl bg-cream-2 p-3">
          <p className="text-sm font-semibold">{user.name}</p>
          <p className="text-xs capitalize text-ink/50">{user.role.replaceAll("_", " ")}</p>
          <Button variant="ghost" size="sm" className="mt-2 w-full justify-start" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>
      <div className="md:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-ink/10 bg-cream/90 px-4 py-3 backdrop-blur md:hidden">
          <p className="font-serif text-xl text-teal-900">Able Aura</p>
          <Button variant="ghost" size="sm" onClick={logout}>
            Sign out
          </Button>
        </header>
        <main className="px-4 py-6 md:px-8">{children}</main>
        <nav className="sticky bottom-0 grid grid-cols-4 gap-1 border-t border-ink/10 bg-white p-2 md:hidden">
          {items.slice(0, 4).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl py-2 text-center text-xs font-semibold text-ink/70"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
