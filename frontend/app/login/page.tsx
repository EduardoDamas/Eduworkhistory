"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { API_URL, DEMO_MODE, saveSession } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useToast } from "../../lib/useToast";

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
          tenantName: "Demo Tenant",
          tenantRole: "OWNER",
          userRole: "OWNER",
          apiKey: "demo_api_key",
        });
        toast.success("Signed in (demo mode)");
        router.push("/dashboard/overview");
        return;
      }

      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = (await response.json()) as {
        token?: string;
        user?: { id: string; email: string; role?: "OWNER" | "ADMIN" | "MODERATOR" | "USER" };
        tenant?: { id: string; name: string; apiKey?: string; role?: "OWNER" | "ADMIN" | "MODERATOR" | "USER" };
        error?: string;
      };

      if (!response.ok || !body.token || !body.user || !body.tenant) {
        throw new Error(body.error ?? "Login failed");
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
      toast.success("Signed in successfully");
      router.push("/dashboard/overview");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-md">
        <Card title="Login" subtitle="Access your integration workspace">
          <div className="space-y-3">
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
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button className="w-full" type="submit" loading={loading}>
              Sign in
            </Button>
            <p className="text-sm text-slate-600">
              New here?{" "}
              <Link href="/register" className="text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                Create account
              </Link>
            </p>
          </div>
        </Card>
      </form>
    </main>
  );
}
