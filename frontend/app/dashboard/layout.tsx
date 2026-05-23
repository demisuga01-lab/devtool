"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  ExternalLink,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Plus,
  Settings,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { clearAuth, getUser, isAuthenticated, StatusUser } from "@/lib/auth";
import { ToastProvider } from "./toast";

type Section = "dashboard" | "monitors" | "incidents" | "maintenance" | "alerts" | "settings" | "reports" | "apiKeys" | "sla";

const sectionTitles: Record<Section, string> = {
  dashboard: "Dashboard",
  monitors: "Monitors",
  incidents: "Incidents",
  maintenance: "Maintenance",
  alerts: "Alerts",
  settings: "Settings",
  reports: "Reports",
  apiKeys: "API Keys",
  sla: "SLA Reports",
};

const navItems = [
  { key: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
  { key: "monitors" as const, label: "Monitors", icon: Activity },
  { key: "incidents" as const, label: "Incidents", icon: AlertTriangle },
  { key: "maintenance" as const, label: "Maintenance", icon: Wrench },
  { key: "alerts" as const, label: "Alerts", icon: Bell },
  { key: "settings" as const, label: "Settings", icon: Settings },
  { key: "reports" as const, label: "Reports", icon: ShieldAlert, href: "/dashboard/reports" },
  { key: "apiKeys" as const, label: "API Keys", icon: KeyRound, href: "/dashboard/api-keys" },
  { key: "sla" as const, label: "SLA", icon: BarChart3, href: "/dashboard/sla" },
];

function getInitials(user: StatusUser | null) {
  if (!user) return "WF";
  return user.username.slice(0, 2).toUpperCase();
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <Suspense fallback={<DashboardLoading />}>
        <DashboardShell>{children}</DashboardShell>
      </Suspense>
    </ToastProvider>
  );
}

function DashboardLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-sm text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        Loading dashboard
      </div>
    </div>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<StatusUser | null>(null);

  const section = useMemo<Section>(() => {
    if (pathname.startsWith("/dashboard/reports")) return "reports";
    if (pathname.startsWith("/dashboard/api-keys")) return "apiKeys";
    if (pathname.startsWith("/dashboard/sla")) return "sla";
    const value = searchParams.get("section");
    return navItems.some((item) => item.key === value) ? (value as Section) : "dashboard";
  }, [pathname, searchParams]);

  useEffect(() => {
    if (pathname === "/dashboard/login") {
      setReady(true);
      return;
    }

    if (!isAuthenticated()) {
      router.replace("/dashboard/login");
      return;
    }

    setUser(getUser());
    setReady(true);
  }, [pathname, router]);

  function logout() {
    clearAuth();
    router.push("/status");
  }

  if (pathname === "/dashboard/login") {
    return <>{children}</>;
  }

  if (!ready) {
    return <DashboardLoading />;
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:flex">
        <Link
          href="/"
          className="flex h-16 items-center gap-2.5 border-b border-zinc-200 px-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
        >
          <Image src="/logo.png" alt="WellFriend DevTools" width={32} height={32} className="h-8 w-8 rounded-xl" />
          <div>
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Dashboard</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-600">by WellFriend</div>
          </div>
        </Link>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = section === item.key;
            const href = "href" in item && item.href ? item.href : item.key === "dashboard" ? "/dashboard" : `/dashboard?section=${item.key}`;
            return (
              <Link
                key={item.key}
                href={href}
                className={
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors " +
                  (active
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100")
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}

          <div className="my-2 border-t border-zinc-200 dark:border-zinc-800" />

          <Link
            href="/status"
            target="_blank"
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <ExternalLink className="h-4 w-4" />
            Public status page
          </Link>
        </nav>

        <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              {getInitials(user)}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {user?.username ?? "Admin"}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-600">Admin</div>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-zinc-500 transition-colors hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col lg:ml-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900 sm:px-6">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{sectionTitles[section]}</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/dashboard?section=monitors&action=add"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400"
            >
              <Plus className="h-4 w-4" />
              Add Monitor
            </Link>
            <Link
              href="/dashboard?section=incidents&filter=active"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              aria-label="View incidents"
            >
              <Bell className="h-4 w-4" />
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
