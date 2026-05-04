"use client";

import Link from "next/link";
import { Card } from "../../../components/ui/Card";
import { getSession } from "../../../lib/api";

function Chevron() {
  return (
    <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function Lock() {
  return (
    <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

const cards = [
  {
    href: "/dashboard/settings/mapping",
    title: "Mapeamento",
    desc: "Configure como os dados dos marketplaces são transformados",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
    admin: true,
    locked: false,
  },
  {
    href: "/dashboard/settings/users",
    title: "Usuários e permissões",
    desc: "Gerencie membros da equipe e suas funções (RBAC)",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.813-2.38M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.646-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
    admin: true,
    locked: false,
  },
  {
    href: "/dashboard/billing",
    title: "Billing",
    desc: "Planos, assinaturas e histórico de pagamentos",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    ),
    admin: true,
    locked: false,
  },
];

export default function SettingsPage() {
  const role = getSession()?.tenantRole ?? getSession()?.userRole ?? "USER";
  const canManage = role === "OWNER" || role === "ADMIN";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">Gerencie configurações da sua organização</p>
      </div>

      {!canManage ? (
        <Card>
          <p className="text-sm text-amber-800">Sua função não tem permissão para alterar estas configurações.</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="group flex items-start gap-4 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-card transition-all hover:border-brand/30 hover:shadow-card-hover focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">{c.icon}</span>
              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-slate-900">{c.title}</h2>
                <p className="mt-1 text-sm text-slate-600">{c.desc}</p>
              </div>
              <Chevron />
            </Link>
          ))}

          <div className="flex items-start gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-6 opacity-80">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-200/80 text-slate-500">
              <Lock />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-slate-700">Webhooks avançados</h2>
              <p className="mt-1 text-sm text-slate-500">Configure endpoints personalizados por tenant</p>
              <p className="mt-2 text-xs font-medium text-amber-700">Permissão de admin necessária</p>
            </div>
            <Lock />
          </div>
        </div>
      )}
    </div>
  );
}
