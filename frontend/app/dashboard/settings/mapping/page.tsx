"use client";

import { useEffect, useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { Card } from "../../../../components/ui/Card";
import { Loader } from "../../../../components/ui/Loader";
import { apiRequest } from "../../../../lib/api";
import { useToast } from "../../../../lib/useToast";

const defaultMapping = {
  customer: { name: "$.customer.full_name", email: "$.customer.email", phone: "$.customer.phone" },
  items: { sku: "$.line_items[*].product_id", quantity: "$.line_items[*].quantity", price: "$.line_items[*].price" },
  delivery: { address: "$.delivery.address", city: "$.delivery.city", state: "$.delivery.state", zipcode: "$.delivery.zip" },
};

export default function MappingSettingsPage() {
  const toast = useToast();
  const [jsonValue, setJsonValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMapping() {
    setLoading(true);
    try {
      const config = await apiRequest<Record<string, unknown>>("/comanda/settings/mapping");
      setJsonValue(JSON.stringify(config, null, 2));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load mapping");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMapping();
  }, []);

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      const parsed = JSON.parse(jsonValue) as Record<string, unknown>;
      await apiRequest("/comanda/settings/mapping", {
        method: "PUT",
        body: JSON.stringify(parsed),
      });
      toast.success("Mapeamento salvo");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save mapping";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  function onRestoreDefault() {
    setJsonValue(JSON.stringify(defaultMapping, null, 2));
    toast.success("JSON padrão carregado — salve para aplicar");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Mapeamento cliente</h1>
        <p className="mt-1 text-sm text-slate-600">
          Configure como os campos dos marketplaces são transformados para o seu sistema
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Loader />
          Carregando…
        </div>
      ) : null}

      <Card title="Configuração JSON">
        <p className="mb-3 text-xs text-slate-500">Use JSONPath para mapear campos. Exemplo: $.customer.name</p>
        <textarea
          className="h-[min(420px,55vh)] w-full rounded-xl border border-slate-200 bg-slate-50/50 p-4 font-mono text-xs leading-relaxed text-slate-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
          value={jsonValue}
          onChange={(e) => setJsonValue(e.target.value)}
          spellCheck={false}
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="button" loading={saving} onClick={() => void onSave()} className="gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25l-6.5 3.75V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
            </svg>
            Salvar
          </Button>
          <Button type="button" variant="ghost" onClick={onRestoreDefault} className="gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Restaurar padrão
          </Button>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </Card>

      <div className="rounded-2xl border border-teal-100 bg-brand/5 p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-teal-900">
          <svg className="h-5 w-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          Dica
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-teal-900/80">
          O JSONPath referencia o payload de entrada: use <code className="rounded bg-white/80 px-1">$</code> para a raiz e{" "}
          <code className="rounded bg-white/80 px-1">[*]</code> para itens em arrays (ex.: linhas do pedido).
        </p>
      </div>
    </div>
  );
}
