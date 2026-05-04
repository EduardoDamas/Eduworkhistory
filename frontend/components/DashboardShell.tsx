"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearSession, getSession } from "../lib/api";
import { Badge } from "./ui/Badge";
import { BrandLogo } from "./BrandLogo";
import { DashboardTopBar } from "./DashboardTopBar";

function NavIcon({ children, active }: { children: ReactNode; active?: boolean }) {
  return (
    <span className={`[&_svg]:h-5 [&_svg]:w-5 ${active ? "text-brand" : "text-slate-500"}`}>{children}</span>
  );
}

const iconOverview = (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
  </svg>
);
const iconOrders = (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
  </svg>
);
const iconPush = (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);
const iconSettings = (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.723 6.723 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.37.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const iconUsers = (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.813-2.38M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.646-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);
const iconBilling = (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
  </svg>
);
const iconRocket = (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 5.84 6 6 0 01-1.855-.108.75.75 0 00-.58.405 4.5 4.5 0 01-3.14 2.49.75.75 0 01-.727-.364l-1.036-2.686a4.5 4.5 0 01-1.653-2.346L3.71 12.59a6 6 0 016.01-6.01c.18.891.46 1.76.84 2.59l4.35 4.35a6.006 6.006 0 012.526 2.526c.83.38 1.7.66 2.59.84z" />
  </svg>
);
const iconLogout = (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
  </svg>
);

type NavItem = { href: string; label: string; icon: ReactNode; adminOnly?: boolean };

const navItems: NavItem[] = [
  { href: "/dashboard/overview", label: "Overview", icon: iconOverview },
  { href: "/dashboard/orders", label: "Orders", icon: iconOrders },
  { href: "/dashboard/push-attempts", label: "Push Attempts", icon: iconPush },
  { href: "/dashboard/settings", label: "Settings", icon: iconSettings, adminOnly: true },
  { href: "/dashboard/settings/users", label: "Users & Roles", icon: iconUsers, adminOnly: true },
  { href: "/dashboard/billing", label: "Billing", icon: iconBilling, adminOnly: true },
  { href: "/onboarding", label: "Onboarding", icon: iconRocket },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = getSession();
  const role = session?.tenantRole ?? session?.userRole ?? "USER";
  const canSeeAdmin = role === "OWNER" || role === "ADMIN";

  return (
    <div className="min-h-screen bg-[#f4f6f8]">
      <div className="flex min-h-screen">
        <aside className="flex w-[260px] shrink-0 flex-col border-r border-slate-200/90 bg-white px-4 py-5">
          <BrandLogo href="/dashboard/overview" />
          <div className="mt-6 border-b border-slate-100 pb-5">
            <p className="truncate text-base font-semibold text-slate-900">{session?.tenantName ?? "Tenant"}</p>
            <p className="text-xs text-slate-500">Integração de pedidos</p>
            <div className="mt-2">
              <Badge label={role} variant={role === "OWNER" ? "owner" : role === "ADMIN" ? "info" : "neutral"} />
            </div>
          </div>

          <nav className="mt-4 flex flex-1 flex-col gap-0.5" aria-label="Principal">
            {navItems
              .filter((item) => !item.adminOnly || canSeeAdmin)
              .map((item) => {
                const onUsers = pathname === "/dashboard/settings/users";
                const underSettings = pathname.startsWith("/dashboard/settings");
                let isActive = pathname === item.href;
                if (item.href === "/dashboard/settings") {
                  isActive = underSettings && !onUsers;
                }
                if (item.href === "/dashboard/settings/users") {
                  isActive = onUsers;
                }
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative flex items-center gap-3 rounded-xl py-2.5 pl-3 pr-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 ${
                      isActive ? "bg-slate-100 text-slate-900 shadow-sm ring-1 ring-slate-200/80" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {isActive ? (
                      <span
                        className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-full bg-brand"
                        aria-hidden
                      />
                    ) : null}
                    <NavIcon active={isActive}>{item.icon}</NavIcon>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
          </nav>

          <button
            type="button"
            className="mt-auto flex items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50/80 py-2.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
            onClick={() => {
              clearSession();
              router.push("/login");
            }}
          >
            <span className="text-red-600">{iconLogout}</span>
            Logout
          </button>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <DashboardTopBar />
          <main className="min-w-0 flex-1 px-6 py-8 lg:px-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
