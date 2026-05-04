import Link from "next/link";
import { Card } from "../components/ui/Card";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
          <p className="text-sm font-medium text-blue-600">Plataforma SaaS para operacao de pedidos</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">Automacao de pedidos para iFood / 99Food</h1>
          <p className="mt-4 max-w-2xl text-slate-600">
            Receba pedidos, mapeie dados e envie para o sistema do cliente com confiabilidade, monitoramento e retry automatico.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/dashboard/overview"
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Ver Dashboard
            </Link>
            <Link
              href="/onboarding"
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Ver Demonstracao
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-14">
        <h2 className="text-2xl font-semibold text-slate-900">Recursos principais</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card title="Multi-tenant SaaS" subtitle="Isolamento por tenant com autenticacao segura.">
            <p className="text-sm text-slate-600">Operacao centralizada para multiplos clientes sem conflito de dados.</p>
          </Card>
          <Card title="Integracao com marketplaces" subtitle="Fluxo pronto para iFood/99Food.">
            <p className="text-sm text-slate-600">Preparado para ingestao de pedidos e adaptacao ao legado do cliente.</p>
          </Card>
          <Card title="Retry automatico" subtitle="Confiabilidade em falhas transitorias.">
            <p className="text-sm text-slate-600">Tentativas com fila e reprocessamento para evitar perda de pedidos.</p>
          </Card>
          <Card title="Dashboard em tempo real" subtitle="Visibilidade operacional instantanea.">
            <p className="text-sm text-slate-600">Acompanhe pedidos, tentativas e status em uma unica tela.</p>
          </Card>
          <Card title="Controle de usuarios e permissoes" subtitle="RBAC por tenant.">
            <p className="text-sm text-slate-600">OWNER, ADMIN e USER com politicas claras para seguranca operacional.</p>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-14">
        <h2 className="text-2xl font-semibold text-slate-900">Como funciona</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <Card title="1. Recebe pedido">
            <p className="text-sm text-slate-600">A plataforma coleta e organiza os pedidos recebidos dos canais.</p>
          </Card>
          <Card title="2. Mapeia dados">
            <p className="text-sm text-slate-600">Transforma payloads para o formato que o sistema do cliente espera.</p>
          </Card>
          <Card title="3. Envia para sistema do cliente">
            <p className="text-sm text-slate-600">Entrega com monitoramento e retries para garantir confiabilidade.</p>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h3 className="text-2xl font-semibold text-slate-900">Pronto para a demonstracao?</h3>
          <p className="mt-2 text-slate-600">Acesse o dashboard e mostre toda a operacao ponta a ponta para o cliente.</p>
          <div className="mt-6">
            <Link
              href="/dashboard/overview"
              className="inline-flex rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Abrir Dashboard
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
