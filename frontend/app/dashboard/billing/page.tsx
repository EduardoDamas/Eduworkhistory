"use client";

import { useEffect, useState } from "react";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { Loader } from "../../../components/ui/Loader";
import { apiRequest } from "../../../lib/api";
import { useToast } from "../../../lib/useToast";

type Billing = {
  plan: "FREE" | "PRO" | "ENTERPRISE";
  status: "ACTIVE" | "TRIAL" | "CANCELED" | "PAST_DUE";
  usageCount: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
};

function UsageBar({ label, current, max }: { label: string; current: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500">
          {current} / {max}
        </span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function BillingPage() {
  const toast = useToast();
  const [billing, setBilling] = useState<Billing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<Billing>("/comanda/billing")
      .then(setBilling)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load billing"))
      .finally(() => setLoading(false));
  }, []);

  async function onUpgrade() {
    try {
      const data = await apiRequest<{ url: string }>("/billing/create-checkout-session", {
        method: "POST",
        body: JSON.stringify({ plan: "PRO" }),
      });
      if (data.url && data.url !== "#") {
        window.location.href = data.url;
      } else {
        toast.success("Checkout (demo): link simulado");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao iniciar checkout";
      setError(message);
      toast.error(message);
    }
  }

  const usage = billing?.usageCount ?? 0;
  const ordersCap = billing?.plan === "PRO" ? 99999 : 100;
  const tenantsCap = billing?.plan === "PRO" ? 999 : 1;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Billing</h1>
        <p className="mt-1 text-sm text-slate-600">Gerencie seu plano, assinatura e pagamentos</p>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Loader />
          Carregando…
        </div>
      ) : null}

      {!loading ? (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="relative overflow-hidden !border-slate-200">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Plano atual</p>
                  <h2 className="mt-1 text-xl font-bold text-slate-900">Grátis para sempre</h2>
                </div>
                <Badge label="ATIVO" variant="success" />
              </div>
              <p className="mt-6 text-4xl font-bold text-slate-900">
                R$ 0<span className="text-lg font-semibold text-slate-500">/mês</span>
              </p>
              <ul className="mt-6 space-y-2 text-sm text-slate-600">
                {["Até 100 pedidos/mês", "1 tenant", "Retry automático básico", "Dashboard de métricas", "Suporte por email"].map((x) => (
                  <li key={x} className="flex items-center gap-2">
                    <span className="text-brand">✓</span>
                    {x}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Button type="button" className="w-full sm:w-auto" onClick={() => void onUpgrade()}>
                  Upgrade para Pro
                </Button>
              </div>
            </Card>

            <Card className="relative border-brand/30 bg-brand/5 !shadow-md ring-1 ring-brand/20">
              <div className="absolute right-5 top-5">
                <Badge label="RECOMENDADO" variant="owner" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Pro</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">Para empresas em crescimento</h2>
              <p className="mt-6 text-4xl font-bold text-slate-900">
                R$ 299<span className="text-lg font-semibold text-slate-500">/mês</span>
              </p>
              <ul className="mt-6 space-y-2 text-sm text-slate-700">
                {[
                  "Pedidos ilimitados",
                  "Multi-tenant ilimitado",
                  "Retry com backoff exponencial",
                  "Analytics avançado",
                  "RBAC completo",
                  "Webhooks customizados",
                  "Suporte prioritário",
                ].map((x) => (
                  <li key={x} className="flex items-center gap-2">
                    <span className="text-brand">✓</span>
                    {x}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Button type="button" className="w-full sm:w-auto" onClick={() => void onUpgrade()}>
                  Começar teste grátis de 14 dias
                </Button>
              </div>
            </Card>
          </div>

          <Card title="Uso atual" subtitle="Consumo no ciclo atual">
            <div className="grid gap-6 md:grid-cols-3">
              <UsageBar label="Pedidos este mês" current={Math.min(usage, ordersCap)} max={ordersCap} />
              <UsageBar label="Tenants ativos" current={1} max={tenantsCap} />
              <UsageBar label="Webhooks enviados" current={Math.min(usage * 3, 1000)} max={1000} />
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Plano atual: <strong>{billing?.plan ?? "FREE"}</strong> · Status:{" "}
              <Badge label={billing?.status ?? "—"} variant={billing?.status === "ACTIVE" || billing?.status === "TRIAL" ? "success" : "warning"} />
            </p>
          </Card>
        </>
      ) : null}
    </div>
  );
}
