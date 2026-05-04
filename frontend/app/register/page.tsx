"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { API_URL, DEMO_MODE, saveSession } from "../../lib/api";
import { BrandLogo } from "../../components/BrandLogo";
import { Button } from "../../components/ui/Button";
import { useToast } from "../../lib/useToast";

export default function RegisterPage() {
  const router = useRouter();
  const toast = useToast();
  const [tenantName, setTenantName] = useState("");
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
          tenantName: tenantName || "Minha Empresa",
          tenantRole: "OWNER",
          userRole: "OWNER",
          apiKey: "demo_api_key",
        });
        toast.success("Conta criada (demo)");
        router.push("/onboarding");
        return;
      }

      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, tenantName }),
      });
      const body = (await response.json()) as {
        token?: string;
        user?: { id: string; email: string; role?: "OWNER" | "ADMIN" | "MODERATOR" | "USER" };
        tenant?: { id: string; name: string; apiKey?: string; role?: "OWNER" | "ADMIN" | "MODERATOR" | "USER" };
        error?: string;
      };

      if (!response.ok || !body.token || !body.user || !body.tenant) {
        throw new Error(body.error ?? "Não foi possível criar a conta");
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
      toast.success("Conta criada");
      router.push("/onboarding");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível criar a conta";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen">
      <div className="relative hidden w-1/2 flex-col justify-end bg-ink p-12 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="absolute h-64 w-64 rounded-full border border-dashed border-brand/40" />
          <div className="absolute h-48 w-48 translate-x-6 translate-y-4 rounded-full border border-brand/30" />
          <div className="absolute h-32 w-32 -translate-x-8 rounded-full border border-brand/50" />
        </div>
        <div className="relative z-10 max-w-md">
          <h2 className="text-3xl font-bold tracking-tight">Comece em minutos</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">Configure sua integração e receba pedidos em tempo real.</p>
        </div>
      </div>

      <div className="flex w-full flex-col justify-center bg-white px-6 py-12 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <BrandLogo href="/" />
          <h1 className="mt-10 text-3xl font-bold tracking-tight text-slate-900">Criar conta</h1>
          <p className="mt-2 text-sm text-slate-600">Configure sua organização em poucos passos</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="org" className="text-xs font-semibold text-slate-700">
                Nome da organização
              </label>
              <input
                id="org"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
                placeholder="Minha Empresa"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="text-xs font-semibold text-slate-700">
                Email
              </label>
              <input
                id="email"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="text-xs font-semibold text-slate-700">
                Senha
              </label>
              <input
                id="password"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button className="w-full !py-3" type="submit" loading={loading}>
              Criar conta
            </Button>
            <p className="text-center text-sm text-slate-600">
              Já tem uma conta?{" "}
              <Link href="/login" className="font-semibold text-brand hover:underline focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2">
                Entrar
              </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
