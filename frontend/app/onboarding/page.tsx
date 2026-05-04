"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { AuthGuard } from "../../components/AuthGuard";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Loader } from "../../components/ui/Loader";
import { API_URL, apiRequest, getSession, saveSession } from "../../lib/api";
import { truncateId } from "../../lib/format";
import { useToast } from "../../lib/useToast";

type Profile = {
  user: { id: string; email: string; role?: string };
  tenants: Array<{ id: string; name: string; apiKey: string; role?: string }>;
};

export default function OnboardingPage() {
  const toast = useToast();
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
      toast.success("Tenant created");
      await load();
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
      toast.success("API key regenerated");
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
    toast.success("API key copied");
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
    { key: "createTenant", label: "Create tenant", done: checklist.createTenant },
    { key: "copyApiKey", label: "Copy API key", done: checklist.copyApiKey },
    { key: "sendTestOrder", label: "Send test order", done: checklist.sendTestOrder },
    { key: "pushOrder", label: "Push order to client", done: checklist.pushOrder },
  ] as const;

  return (
    <AuthGuard>
      <main className="mx-auto max-w-4xl space-y-5 p-6">
        <h1 className="text-2xl font-semibold">Onboarding</h1>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Loader />
            Loading onboarding data...
          </div>
        ) : null}

        <Card title="Checklist" subtitle="Track demo readiness">
          <ul className="space-y-2 text-sm">
            {checklistItems.map((item) => (
              <li key={item.key} className="flex items-center gap-2">
                <span>{item.done ? "✅" : "⬜"}</span>
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="1. Create tenant">
          <form className="flex gap-2" onSubmit={onCreateTenant}>
            <input
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 transition-colors duration-150 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              placeholder="Tenant name"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              required
            />
            <Button type="submit" loading={submitting}>
              Create
            </Button>
          </form>
          <p className="mt-3 text-sm text-slate-600">Current tenant: {profile?.tenants[0]?.name ?? "Not available"}</p>
        </Card>

        <Card title="2. API key">
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => void onRegenerateApiKey()} loading={regenerating}>
              Regenerate key
            </Button>
            <Button variant="ghost" aria-label="Copy API key" onClick={() => void onCopyApiKey()} disabled={!apiKey}>
              {copied ? "Copied ✓" : "Copy key"}
            </Button>
          </div>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">{apiKey || "API_KEY"}</pre>
          <p className="mt-2 text-xs text-slate-500">Short preview: {truncateId(apiKey || "API_KEY", 10)}</p>
        </Card>

        <Card title="3. Integration quickstart">
          <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">{commands}</pre>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => setChecklist((p) => ({ ...p, sendTestOrder: true }))}>
              Mark "test order sent"
            </Button>
            <Button variant="ghost" onClick={() => setChecklist((p) => ({ ...p, pushOrder: true }))}>
              Mark "order pushed"
            </Button>
          </div>
        </Card>

        <Link
          href="/dashboard/overview"
          className="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Open dashboard
        </Link>
      </main>
    </AuthGuard>
  );
}
