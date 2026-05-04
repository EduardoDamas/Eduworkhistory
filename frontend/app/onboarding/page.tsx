"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { AuthGuard } from "../../components/AuthGuard";
import { OnboardingHeader } from "../../components/OnboardingHeader";
import { Button } from "../../components/ui/Button";
import { Loader } from "../../components/ui/Loader";
import { API_URL, apiRequest, getSession, saveSession } from "../../lib/api";
import { truncateId } from "../../lib/format";
import { useToast } from "../../lib/useToast";

type Profile = {
  user: { id: string; email: string; role?: string };
  tenants: Array<{ id: string; name: string; apiKey: string; role?: string }>;
};

const steps = [
  { n: 1, label: "Conta" },
  { n: 2, label: "API Key" },
  { n: 3, label: "Teste" },
] as const;

export default function OnboardingPage() {
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [tenantName, setTenantName] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [checklist, setChecklist] = useState({
    createTenant: false,
    copyApiKey: false,
    sendTestOrder: false,
    pushOrder: false,
  });

  async function load() {
    setLoading(true);
    try {
      const data = await apiRequest<Profile>("/saas/me");
      setProfile(data);
      const first = data.tenants[0];
      setApiKey(first?.apiKey ?? "");
      setChecklist((prev) => ({ ...prev, createTenant: Boolean(first) }));
      if (first) setStep(2);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load onboarding");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreateTenant(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await apiRequest<{
        tenant: { id: string; name: string; apiKey: string; role?: "OWNER" | "ADMIN" | "MODERATOR" | "USER" };
        token: string;
      }>("/saas/tenants", {
        method: "POST",
        body: JSON.stringify({ name: tenantName }),
      });
      const session = getSession();
      if (session) {
        saveSession({
          ...session,
          token: response.token,
          tenantId: response.tenant.id,
          tenantName: response.tenant.name,
          apiKey: response.tenant.apiKey,
          tenantRole: response.tenant.role,
        });
      }
      setTenantName("");
      setChecklist((prev) => ({ ...prev, createTenant: true }));
      toast.success("Organização criada");
      await load();
      setStep(2);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create tenant";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function onRegenerateApiKey() {
    setRegenerating(true);
    setError(null);
    try {
      const response = await apiRequest<{ apiKey: string }>("/saas/tenants/regenerate-api-key", {
        method: "POST",
      });
      setApiKey(response.apiKey);
      toast.success("Chave regenerada");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to regenerate API key";
      setError(message);
      toast.error(message);
    } finally {
      setRegenerating(false);
    }
  }

  async function onCopyApiKey() {
    if (!apiKey) return;
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(apiKey);
    } else {
      const input = document.createElement("textarea");
      input.value = apiKey;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.focus();
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setChecklist((prev) => ({ ...prev, copyApiKey: true }));
    toast.success("Chave copiada");
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  const commands = useMemo(
    () => `curl -s ${API_URL}/comanda/orders/pending \\
  -H "x-api-key: ${apiKey || "API_KEY"}"

curl -s -X POST ${API_URL}/comanda/orders/ORDER_ID/ack \\
  -H "x-api-key: ${apiKey || "API_KEY"}"

curl -s -X POST ${API_URL}/comanda/orders/ORDER_ID/push \\
  -H "x-api-key: ${apiKey || "API_KEY"}"`,
    [apiKey],
  );

  const checklistItems = [
    { key: "createTenant" as const, label: "Criar organização", done: checklist.createTenant },
    { key: "copyApiKey" as const, label: "Copiar API key", done: checklist.copyApiKey },
    { key: "sendTestOrder" as const, label: "Enviar pedido de teste", done: checklist.sendTestOrder },
    { key: "pushOrder" as const, label: "Push para o cliente", done: checklist.pushOrder },
  ];

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#f4f6f8]">
        <OnboardingHeader />

        <div className="mx-auto max-w-lg px-6 pb-16 pt-10">
          <div className="mb-12 flex items-start justify-center gap-4 sm:gap-10">
            {steps.map((s, i) => (
              <div key={s.n} className="flex items-start gap-4 sm:gap-10">
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                      step >= s.n ? "bg-brand text-white shadow-md" : "border-2 border-slate-200 bg-white text-slate-400"
                    }`}
                  >
                    {s.n}
                  </div>
                  <span className={`text-center text-xs font-medium ${step >= s.n ? "text-slate-900" : "text-slate-400"}`}>{s.label}</span>
                </div>
                {i < steps.length - 1 ? <div className="mt-5 hidden h-0.5 w-8 bg-slate-200 sm:block" aria-hidden /> : null}
              </div>
            ))}
          </div>

          {error ? <p className="mb-4 text-center text-sm text-red-600">{error}</p> : null}
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-16 text-slate-600">
              <Loader />
              <p className="text-sm">Carregando…</p>
            </div>
          ) : (
            <>
              {step === 1 ? (
                <div className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-card">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">Configure sua organização</h1>
                  <p className="mt-2 text-sm text-slate-600">Escolha um nome para identificar sua organização no OrderFlow.</p>
                  <form className="mt-8 space-y-4" onSubmit={onCreateTenant}>
                    <div>
                      <label htmlFor="org" className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Nome da organização
                      </label>
                      <input
                        id="org"
                        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 shadow-sm transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                        placeholder="Minha Empresa"
                        value={tenantName}
                        onChange={(e) => setTenantName(e.target.value)}
                        required
                      />
                    </div>
                    <Button className="w-full" type="submit" loading={submitting}>
                      Continuar
                    </Button>
                  </form>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-card">
                    <h1 className="text-xl font-bold text-slate-900">Sua API key</h1>
                    <p className="mt-2 text-sm text-slate-600">Guarde em local seguro. Ela autentica integrações no backend.</p>
                    <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-900 p-4 font-mono text-xs text-teal-100">{apiKey || "—"}</pre>
                    <p className="mt-2 text-xs text-slate-500">Preview: {truncateId(apiKey || "API_KEY", 10)}</p>
                    <div className="mt-6 flex flex-wrap gap-2">
                      <Button type="button" variant="secondary" loading={regenerating} onClick={() => void onRegenerateApiKey()}>
                        Gerar nova chave
                      </Button>
                      <Button type="button" variant="ghost" aria-label="Copiar API key" onClick={() => void onCopyApiKey()} disabled={!apiKey}>
                        {copied ? "Copiado ✓" : "Copiar chave"}
                      </Button>
                    </div>
                    <Button className="mt-8 w-full" type="button" onClick={() => setStep(3)}>
                      Continuar
                    </Button>
                  </div>
                </div>
              ) : null}

              {step === 3 ? (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-card">
                    <h1 className="text-xl font-bold text-slate-900">Teste rápido</h1>
                    <p className="mt-2 text-sm text-slate-600">Marque as etapas conforme for validando a integração.</p>
                    <ul className="mt-6 space-y-3">
                      {checklistItems.map((item) => (
                        <li key={item.key} className="flex items-center gap-3 text-sm">
                          <button
                            type="button"
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 text-xs font-bold transition-colors ${
                              item.done ? "border-brand bg-brand text-white" : "border-slate-200 bg-white text-slate-400"
                            }`}
                            onClick={() => {
                              if (item.key === "sendTestOrder" || item.key === "pushOrder") {
                                setChecklist((p) => ({ ...p, [item.key]: !p[item.key] }));
                              }
                            }}
                            aria-pressed={item.done}
                          >
                            {item.done ? "✓" : ""}
                          </button>
                          <span className={item.done ? "text-slate-500 line-through" : "text-slate-800"}>{item.label}</span>
                        </li>
                      ))}
                    </ul>
                    <pre className="mt-6 overflow-x-auto rounded-xl bg-slate-900 p-4 font-mono text-[11px] leading-relaxed text-slate-100">{commands}</pre>
                    <Link
                      href="/dashboard/overview"
                      className="mt-8 flex w-full items-center justify-center rounded-xl bg-brand py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
                    >
                      Abrir dashboard
                    </Link>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
