"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearSession, getSession } from "../lib/api";
import { Badge } from "./ui/Badge";

const links = [
  { href: "/dashboard/overview", label: "Overview", icon: "📊", adminOnly: false },
  { href: "/dashboard/orders", label: "Orders", icon: "🧾", adminOnly: false },
  { href: "/dashboard/push-attempts", label: "Push Attempts", icon: "🔁", adminOnly: false },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙️", adminOnly: true },
  { href: "/dashboard/settings/users", label: "Users & Roles", icon: "👥", adminOnly: true },
  { href: "/dashboard/billing", label: "Billing", icon: "💳", adminOnly: true },
  { href: "/onboarding", label: "Onboarding", icon: "🚀", adminOnly: false },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = getSession();
  const role = session?.tenantRole ?? session?.userRole ?? "USER";
  const canSeeAdmin = role === "OWNER" || role === "ADMIN";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">OrderFlow</p>
            <p className="text-lg font-semibold text-slate-900">{session?.tenantName ?? "Tenant"}</p>
            <p className="text-xs text-slate-500">Integracao de pedidos</p>
          </div>
          <Badge label={role} variant={canSeeAdmin ? "success" : "neutral"} />
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <aside className="w-64 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200">
          <nav className="space-y-1">
            {links
              .filter((link) => !link.adminOnly || canSeeAdmin)
              .map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      active ? "bg-gray-200 font-medium text-slate-900" : "text-slate-700 hover:bg-gray-100"
                    }`}
                  >
                    <span>{link.icon}</span>
                    <span>{link.label}</span>
                  </Link>
                );
              })}
          </nav>

          <button
            type="button"
            className="mt-8 w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition-colors duration-150 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            onClick={() => {
              clearSession();
              router.push("/login");
            }}
          >
            Logout
          </button>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
