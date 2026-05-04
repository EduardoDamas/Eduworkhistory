"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { API_URL, DEMO_MODE, saveSession } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useToast } from "../../lib/useToast";

const roleOptions = ["OWNER", "ADMIN", "MODERATOR", "USER"] as const;

export default function RegisterPage() {
  const router = useRouter();
  const toast = useToast();
  const [tenantName, setTenantName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<(typeof roleOptions)[number]>("OWNER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (DEMO_MODE) {
        saveSession({
          token: "demo-token",
          userId: "user_owner_demo",
          email: email || "owner@demo-tenant.com",
          tenantId: "tenant_demo",
          tenantName: tenantName || "Demo Tenant",
          tenantRole: "OWNER",
          userRole: role,
          apiKey: "demo_api_key",
        });
        toast.success("Account created (demo mode)");
        router.push("/onboarding");
        return;
      }

      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, tenantName, role }),
      });
      const body = (await response.json()) as {
        token?: string;
        user?: { id: string; email: string; role?: "OWNER" | "ADMIN" | "MODERATOR" | "USER" };
        tenant?: { id: string; name: string; apiKey?: string; role?: "OWNER" | "ADMIN" | "MODERATOR" | "USER" };
        error?: string;
      };

      if (!response.ok || !body.token || !body.user || !body.tenant) {
        throw new Error(body.error ?? "Registration failed");
      }

      saveSession({
        token: body.token,
        userId: body.user.id,
        email: body.user.email,
        userRole: body.user.role,
        tenantId: body.tenant.id,
        tenantName: body.tenant.name,
        tenantRole: body.tenant.role,
        apiKey: body.tenant.apiKey,
      });
      toast.success("Account created");
      router.push("/onboarding");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-md">
        <Card title="Create account" subtitle="Start your tenant onboarding">
          <div className="space-y-3">
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 transition-colors duration-150 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              placeholder="Tenant name"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              required
            />
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 transition-colors duration-150 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 transition-colors duration-150 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              type="password"
              placeholder="Password (min 6 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 transition-colors duration-150 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              value={role}
              onChange={(e) => setRole(e.target.value as (typeof roleOptions)[number])}
            >
              {roleOptions.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button className="w-full" type="submit" loading={loading}>
              Create account
            </Button>
            <p className="text-sm text-slate-600">
              Already have an account?{" "}
              <Link href="/login" className="text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                Login
              </Link>
            </p>
          </div>
        </Card>
      </form>
    </main>
  );
}
