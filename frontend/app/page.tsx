import Link from "next/link";
import { BrandLogo } from "../components/BrandLogo";

const features = [
  {
    title: "Multi-tenant SaaS",
    desc: "Isolamento por tenant com autenticação segura e dados separados.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" />
      </svg>
    ),
  },
  {
    title: "Integração marketplaces",
    desc: "Fluxo preparado para iFood, 99Food e adaptação ao legado do cliente.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m14.978 0H18M5.25 2.25h13.5c1.24 0 2.25 1.01 2.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25H5.25a2.25 2.25 0 01-2.25-2.25V4.5a2.25 2.25 0 012.25-2.25z" />
      </svg>
    ),
  },
  {
    title: "Retry automático",
    desc: "Fila e reprocessamento para falhas transitórias sem perder pedidos.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
      </svg>
    ),
  },
  {
    title: "Dashboard tempo real",
    desc: "Pedidos, tentativas de push e status em uma única visão operacional.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v4.125c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 013 17.25v-4.125zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125v-8.25zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    title: "RBAC completo",
    desc: "OWNER, ADMIN e equipe com políticas claras para segurança operacional.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-ink text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <BrandLogo href="/" inverted />
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-ink">
            Entrar
          </Link>
          <Link
            href="/register"
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-ink shadow-lg shadow-brand/20 hover:bg-brand-100 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-ink"
          >
            Criar conta
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-8 lg:grid-cols-2 lg:items-center">
        <div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight lg:text-5xl">
            Automação de pedidos para marketplaces e seu ERP
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-400">
            Conecte iFood, 99Food e outros canais com atualização em tempo real, retries inteligentes e painel multi-tenant.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/dashboard/overview"
              className="rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-ink shadow-lg shadow-brand/25 hover:bg-brand-100 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-ink"
            >
              Ver demo do dashboard
            </Link>
            <Link
              href="/onboarding"
              className="rounded-xl border border-slate-600 px-6 py-3 text-sm font-semibold text-white hover:border-slate-500 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-ink"
            >
              Ver onboarding
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap gap-2">
            <span className="rounded-full border border-slate-700 bg-slate-900/50 px-3 py-1 text-xs text-slate-300">Compatível com fluxos iFood</span>
            <span className="rounded-full border border-slate-700 bg-slate-900/50 px-3 py-1 text-xs text-slate-300">Compatível com fluxos 99Food</span>
          </div>
        </div>
        <div className="relative flex min-h-[280px] items-center justify-center lg:min-h-[360px]">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-72 w-72 rounded-full border border-dashed border-brand/50" />
            <div className="absolute h-52 w-52 rounded-full border border-brand/30" />
            <div className="absolute flex gap-3">
              <span className="h-3 w-3 rounded-full bg-brand" />
              <span className="mt-4 h-3 w-3 rounded-full bg-brand/70" />
              <span className="h-3 w-3 rounded-full bg-brand" />
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-800 bg-slate-950/50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-2xl font-bold">Recursos principais</h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 transition-colors hover:border-slate-700"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/15 text-brand">{f.icon}</div>
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-2xl font-bold">Como funciona</h2>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {[
            { n: "1", t: "Configure sua API", d: "Crie o tenant, copie a chave e conecte seus canais." },
            { n: "2", t: "Mapeie seus campos", d: "Transforme o payload do marketplace para o seu sistema." },
            { n: "3", t: "Receba pedidos", d: "Monitore pushes, retries e erros em tempo real." },
          ].map((s) => (
            <div key={s.n} className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand text-lg font-bold text-ink">{s.n}</div>
              <h3 className="mt-4 font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm text-slate-400">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-800 py-16">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h3 className="text-2xl font-bold">Pronto para começar?</h3>
          <p className="mt-3 text-slate-400">Crie uma conta gratuita e explore o dashboard com dados de demonstração.</p>
          <Link
            href="/register"
            className="mt-8 inline-flex rounded-xl bg-brand px-8 py-3 text-sm font-semibold text-ink hover:bg-brand-100 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-ink"
          >
            Criar conta gratuita
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-800 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} OrderFlow. Todos os direitos reservados.</p>
          <div className="flex gap-6">
            <span className="cursor-default">Termos</span>
            <span className="cursor-default">Privacidade</span>
            <span className="cursor-default">Contato</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
