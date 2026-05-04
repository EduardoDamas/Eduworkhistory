"use client";

import { useEffect, useState } from "react";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { EmptyState } from "../../../components/ui/EmptyState";
import { Skeleton } from "../../../components/ui/Skeleton";
import { apiRequest } from "../../../lib/api";
import { formatCurrency, formatDate, orderStatusPt, orderTableId } from "../../../lib/format";
import { useToast } from "../../../lib/useToast";

type PendingOrder = {
  id: string;
  status: string;
  statusCode: number;
  total: number;
  createdAt: string;
};

type PendingResponse = {
  orders: PendingOrder[];
  meta: { count: number; polledAt: string };
};

export default function OrdersPage() {
  const toast = useToast();
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [pushingOrderId, setPushingOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadOrders() {
    setLoading(true);
    try {
      const response = await apiRequest<PendingResponse | PendingOrder[]>("/comanda/orders/pending");
      const raw = Array.isArray(response) ? response : response.orders;
      setOrders(Array.isArray(raw) ? raw : []);
      setError(null);
    } catch (err) {
      setOrders([]);
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders();
  }, []);

  async function pushOrder(orderId: string) {
    setPushingOrderId(orderId);
    try {
      await apiRequest(`/comanda/orders/${orderId}/push`, { method: "POST" });
      toast.success("Pedido enfileirado para push");
      await loadOrders();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Push failed";
      setError(message);
      toast.error(message);
    } finally {
      setPushingOrderId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Orders</h1>
          <p className="mt-1 text-sm text-slate-600">Todos os pedidos recebidos dos marketplaces</p>
        </div>
        <Button variant="ghost" loading={loading} onClick={() => void loadOrders()} className="shrink-0 gap-2">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          Atualizar
        </Button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <Card>
          <div className="space-y-3">
            <Skeleton className="h-8 w-11/12" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-8 w-2/3" />
          </div>
        </Card>
      ) : (
        <Card>
          <div className="mb-4">
            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
              Filtros em breve
            </span>
          </div>
          {!(orders?.length ?? 0) ? (
            <EmptyState icon="📋" title="Nenhum pedido pendente" description="Os pedidos aparecerão aqui quando o polling retornar dados." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="min-w-full">
                <thead>
                  <tr className="table-head">
                    <th scope="col" className="px-4 pb-3">
                      ID
                    </th>
                    <th scope="col" className="px-4 pb-3">
                      Status
                    </th>
                    <th scope="col" className="px-4 pb-3">
                      Data
                    </th>
                    <th scope="col" className="px-4 pb-3">
                      Total
                    </th>
                    <th scope="col" className="px-4 pb-3 text-right">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(orders ?? []).map((order) => {
                    const st = orderStatusPt(order.status, order.statusCode);
                    const badgeVariant = st.tone === "success" ? "success" : st.tone === "error" ? "error" : st.tone === "warning" ? "warning" : "neutral";
                    return (
                      <tr key={order.id} className="transition-colors hover:bg-slate-50/80">
                        <td className="table-cell px-4 font-mono text-sm font-semibold text-slate-800">{orderTableId(order.id)}</td>
                        <td className="table-cell px-4">
                          <Badge label={st.label} variant={badgeVariant} />
                        </td>
                        <td className="table-cell px-4 text-slate-600">{formatDate(order.createdAt)}</td>
                        <td className="table-cell px-4 font-medium text-slate-900">{formatCurrency(order.total)}</td>
                        <td className="table-cell px-4 text-right">
                          <details className="relative inline-block text-left">
                            <summary className="cursor-pointer list-none rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand [&::-webkit-details-marker]:hidden">
                              <span className="sr-only">Ações do pedido</span>
                              <span aria-hidden className="text-lg font-bold tracking-widest">
                                ···
                              </span>
                            </summary>
                            <div className="absolute right-0 z-10 mt-1 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                              <button
                                type="button"
                                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                disabled={pushingOrderId === order.id}
                                onClick={() => void pushOrder(order.id)}
                              >
                                {pushingOrderId === order.id ? "Enfileirando…" : "Push para cliente"}
                              </button>
                            </div>
                          </details>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
