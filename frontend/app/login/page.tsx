"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { API_URL, DEMO_MODE, saveSession } from "../../lib/api";
import { BrandLogo } from "../../components/BrandLogo";
import { Button } from "../../components/ui/Button";
import { useToast } from "../../lib/useToast";

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    void remember;
    setLoading(true);
    setError(null);
    try {
      if (DEMO_MODE) {
        saveSession({
          token: "demo-token",
          userId: "user_owner_demo",
          email: email || "owner@demo-tenant.com",
          tenantId: "tenant_demo",
          tenantName: "Minha Empresa",
          tenantRole: "OWNER",
          userRole: "OWNER",
          apiKey: "demo_api_key",
        });
        toast.success("Sessão iniciada (demo)");
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
        throw new Error(body.error ?? "Falha no login");
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
      toast.success("Bem-vindo de volta");
      router.push("/dashboard/overview");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha no login";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen">
      <div className="relative hidden w-1/2 flex-col justify-end bg-ink p-12 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-30">
          <div className="h-72 w-72 rounded-full border-2 border-brand" />
          <div className="absolute h-56 w-56 rounded-full border border-brand/60" />
          <div className="absolute h-40 w-40 rounded-full border border-brand/40" />
        </div>
        <div className="relative z-10 max-w-md">
          <h2 className="text-3xl font-bold tracking-tight">Automação que funciona</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            Conecte seus marketplaces ao ERP com confiança e transparência.
          </p>
        </div>
      </div>

      <div className="flex w-full flex-col justify-center bg-white px-6 py-12 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <BrandLogo href="/" />
          <h1 className="mt-10 text-3xl font-bold tracking-tight text-slate-900">Bem-vinda de volta</h1>
          <p className="mt-2 text-sm text-slate-600">Entre com suas credenciais para continuar</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="text-xs font-semibold text-slate-700">
                Email
              </label>
              <input
                id="email"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 shadow-sm transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
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
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 shadow-sm transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="rounded border-slate-300 text-brand focus:ring-brand"
              />
              Lembrar deste dispositivo
            </label>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button className="w-full !py-3" type="submit" loading={loading}>
              Entrar
            </Button>
            <p className="text-center text-sm text-slate-600">
              Não tem uma conta?{" "}
              <Link href="/register" className="font-semibold text-brand hover:underline focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2">
                Criar conta
              </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
