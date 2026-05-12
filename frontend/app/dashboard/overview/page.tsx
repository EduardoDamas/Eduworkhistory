"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "../../../components/ui/Badge";
import { Card } from "../../../components/ui/Card";
import { EmptyState } from "../../../components/ui/EmptyState";
import { Skeleton } from "../../../components/ui/Skeleton";
import { apiRequest } from "../../../lib/api";
import { formatCurrency, formatDate, pushStatusPt, truncateId } from "../../../lib/format";

type Billing = {
  plan: string;
  status: string;
  usageCount: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
};

type Order = {
  id: string;
  status: string;
  statusCode: number;
  total: number;
  createdAt: string;
};

type OrdersResponse = {
  orders: Order[];
  meta: { count: number; polledAt: string };
};

type PushAttempt = {
  id: string;
  orderId: string;
  status: "SUCCESS" | "FAILED" | "RETRYING" | string;
  attemptCount: number;
  updatedAt: string;
};

type IntegrationsHealth = {
  ifood: {
    enabled: boolean;
    clientIdConfigured: boolean;
    clientSecretConfigured: boolean;
    merchantIdConfigured: boolean;
  };
  twilio: {
    enabled: boolean;
    accountSidConfigured: boolean;
    authTokenConfigured: boolean;
    whatsappFromConfigured: boolean;
    whatsappToConfigured: boolean;
    sandboxJoinCodeConfigured?: boolean;
    sandboxFrom?: string;
  };
  testMode?: boolean;
};

function MiniBars() {
  return (
    <div className="mt-4 flex h-10 items-end gap-1">
      {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
        <div key={i} className="w-1.5 rounded-sm bg-sky-200" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

export default function OverviewPage() {
  const [billing, setBilling] = useState<Billing | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [attempts, setAttempts] = useState<PushAttempt[]>([]);
  const [integrationsHealth, setIntegrationsHealth] = useState<IntegrationsHealth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      apiRequest<Billing>("/saas/billing"),
      apiRequest<OrdersResponse | Order[]>("/comanda/orders/pending"),
      apiRequest<PushAttempt[]>("/comanda/push-attempts?limit=8"),
      apiRequest<IntegrationsHealth>("/integrations/health"),
    ])
      .then(([billingResult, ordersResult, attemptsResult, integrationsResult]) => {
        if (billingResult.status === "fulfilled") {
          setBilling(billingResult.value);
        }
        if (ordersResult.status === "fulfilled") {
          const rawOrders = Array.isArray(ordersResult.value)
            ? ordersResult.value
            : ordersResult.value.orders;
          setOrders(Array.isArray(rawOrders) ? rawOrders : []);
        } else {
          setOrders([]);
        }
        if (attemptsResult.status === "fulfilled") {
          setAttempts(Array.isArray(attemptsResult.value) ? attemptsResult.value : []);
        } else {
          setAttempts([]);
        }
        if (integrationsResult.status === "fulfilled") {
          setIntegrationsHealth(integrationsResult.value);
        }
        const hasHardFailure =
          ordersResult.status === "rejected" || integrationsResult.status === "rejected";
        if (hasHardFailure) {
          setError("Failed to load part of dashboard data");
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  const metrics = useMemo(() => {
    const success = attempts.filter((x) => x.status === "SUCCESS").length;
    const failed = attempts.filter((x) => x.status === "FAILED").length;
    const retrying = attempts.filter((x) => x.status === "RETRYING").length;
    return { success, failed, retrying };
  }, [attempts]);

  const integrationIfoodOk = Boolean(
    integrationsHealth?.ifood.clientIdConfigured &&
      integrationsHealth.ifood.clientSecretConfigured &&
      integrationsHealth.ifood.merchantIdConfigured,
  );
  const integrationTwilioOk = Boolean(
    integrationsHealth?.twilio.accountSidConfigured &&
      integrationsHealth.twilio.authTokenConfigured &&
      integrationsHealth.twilio.whatsappFromConfigured &&
      integrationsHealth.twilio.whatsappToConfigured,
  );

  const demoDone = 2;
  const demoTotal = 6;
  const demoPct = Math.round((demoDone / demoTotal) * 100);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Overview</h1>
        <p className="mt-1 text-sm text-slate-600">Acompanhe métricas e atividade em tempo real</p>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <Skeleton className="mb-2 h-4 w-1/2" />
              <Skeleton className="h-10 w-2/3" />
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card title="Total de pedidos" className="!p-5">
              <p className="text-3xl font-bold text-slate-900">{orders.length}</p>
              <p className="mt-1 text-xs font-medium text-emerald-600">+12.5% vs. período anterior</p>
              <MiniBars />
            </Card>
            <Card title="Pendentes" className="!p-5">
              <p className="text-3xl font-bold text-slate-900">{metrics.retrying}</p>
              <p className="mt-1 text-xs font-medium text-red-500">-8.2% vs. período anterior</p>
              <MiniBars />
            </Card>
            <Card title="Sucesso push" className="!p-5">
              <p className="text-3xl font-bold text-slate-900">
                {attempts.length ? `${Math.round((metrics.success / attempts.length) * 1000) / 10}%` : "—"}
              </p>
              <p className="mt-1 text-xs font-medium text-emerald-600">+2.1% vs. período anterior</p>
              <MiniBars />
            </Card>
            <Card title="Falhas" className="!p-5">
              <p className="text-3xl font-bold text-slate-900">{metrics.failed}</p>
              <p className="mt-1 text-xs font-medium text-red-500">-15.3% vs. período anterior</p>
              <MiniBars />
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card title="Atividade recente" subtitle="Últimos eventos do ambiente">
              {attempts.length === 0 ? (
                <EmptyState
                  icon="⏱"
                  title="Sem atividade recente"
                  description="As tentativas de push aparecerão aqui assim que houver tráfego."
                />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {attempts.slice(0, 5).map((item) => {
                    const st = pushStatusPt(item.status);
                    const variant = st.tone === "success" ? "success" : st.tone === "error" ? "error" : "warning";
                    const rowBg = st.tone === "error" ? "bg-red-50/50" : "";
                    return (
                      <li
                        key={item.id}
                        className={`flex items-center justify-between py-3 first:pt-0 ${rowBg} -mx-2 rounded-lg px-2`}
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-900">Pedido {truncateId(item.orderId, 6)}</p>
                          <p className="text-xs text-slate-500">{formatDate(item.updatedAt)}</p>
                        </div>
                        <Badge label={st.label} variant={variant} />
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            <Card title="Billing" subtitle="Resumo do plano">
              <div className="space-y-2 text-sm">
                <p>
                  Plano: <span className="font-semibold text-slate-900">{billing?.plan ?? "—"}</span>
                </p>
                <p className="flex items-center gap-2">
                  Status:{" "}
                  <Badge
                    label={billing?.status ?? "—"}
                    variant={billing?.status === "ACTIVE" || billing?.status === "TRIAL" ? "success" : "warning"}
                  />
                </p>
                <p className="text-slate-600">Uso: {billing?.usageCount ?? 0} pushes no ciclo</p>
                {orders[0] ? <p className="text-slate-600">Último total: {formatCurrency(orders[0].total)}</p> : null}
              </div>
            </Card>

            <Card title="Integrações de teste" subtitle="Status atual de configuração">
              <div className="space-y-3 text-sm">
                <p className="flex items-center justify-between gap-2">
                  <span>iFood</span>
                  <Badge
                    label={integrationIfoodOk ? "CONFIGURADO" : "FALTANDO"}
                    variant={integrationIfoodOk ? "success" : "warning"}
                  />
                </p>
                <p className="flex items-center justify-between gap-2">
                  <span>Twilio</span>
                  <Badge
                    label={integrationTwilioOk ? "CONFIGURADO" : "FALTANDO"}
                    variant={integrationTwilioOk ? "success" : "warning"}
                  />
                </p>
                <p className="text-slate-600">
                  Sandbox:{" "}
                  <span className="font-semibold">
                    {integrationsHealth?.twilio.sandboxFrom ?? "whatsapp:+14155238886"}
                  </span>
                </p>
                <p className="text-xs text-slate-500">
                  Lembrete: o tester precisa entrar no sandbox primeiro (join code).
                </p>
              </div>
            </Card>
          </div>

          <Card title="Demo flow — Apresentação ao cliente" subtitle="Checklist para demonstração">
            <ul className="space-y-3">
              {[
                "Visão geral e KPIs",
                "Lista de pedidos e status",
                "Tentativas de push e retry",
                "Mapeamento JSON",
                "Usuários e permissões",
                "Billing e limites",
              ].map((label, i) => (
                <li key={label} className="flex items-center gap-3 text-sm">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 text-xs ${
                      i < demoDone ? "border-brand bg-brand text-white" : "border-slate-200 text-slate-300"
                    }`}
                  >
                    {i < demoDone ? "✓" : ""}
                  </span>
                  <span className={i < demoDone ? "text-slate-500 line-through" : "font-medium text-slate-800"}>
                    {label}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                <span>Progresso</span>
                <span>{demoPct}% completo</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${demoPct}%` }} />
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
