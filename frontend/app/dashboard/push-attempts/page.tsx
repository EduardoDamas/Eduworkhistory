"use client";

import { useEffect, useState } from "react";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { EmptyState } from "../../../components/ui/EmptyState";
import { Skeleton } from "../../../components/ui/Skeleton";
import { apiRequest } from "../../../lib/api";
import { formatDate, orderTableId, pushStatusPt } from "../../../lib/format";
import { useToast } from "../../../lib/useToast";

type PushAttempt = {
  id: string;
  orderId: string;
  status: string;
  attemptCount: number;
  lastError: string | null;
  updatedAt: string;
};

export default function PushAttemptsPage() {
  const toast = useToast();
  const [rows, setRows] = useState<PushAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadAttempts() {
    setLoading(true);
    try {
      const data = await apiRequest<PushAttempt[]>("/comanda/push-attempts?limit=50");
      setRows(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load attempts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAttempts();
  }, []);

  async function retryAttempt(id: string) {
    setRetryingId(id);
    try {
      await apiRequest(`/comanda/push-attempts/${id}/retry`, { method: "POST" });
      toast.success("Retry solicitado");
      await loadAttempts();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Retry failed";
      setError(message);
      toast.error(message);
    } finally {
      setRetryingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Push Attempts</h1>
        <p className="mt-1 text-sm text-slate-600">Histórico de tentativas de envio para o sistema do cliente</p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <Card>
          <div className="space-y-3">
            <Skeleton className="h-8 w-10/12" />
            <Skeleton className="h-8 w-4/5" />
            <Skeleton className="h-8 w-1/2" />
          </div>
        </Card>
      ) : (
        <Card>
          {!rows.length ? (
            <EmptyState icon="🔁" title="Nenhuma tentativa ainda" description="As tentativas aparecerão após pushes de pedidos." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="min-w-full">
                <thead>
                  <tr className="table-head">
                    <th scope="col" className="px-4 pb-3">
                      Pedido
                    </th>
                    <th scope="col" className="px-4 pb-3">
                      Tentativas
                    </th>
                    <th scope="col" className="px-4 pb-3">
                      Status
                    </th>
                    <th scope="col" className="px-4 pb-3">
                      Último erro
                    </th>
                    <th scope="col" className="px-4 pb-3">
                      Última tentativa
                    </th>
                    <th scope="col" className="px-4 pb-3 text-right">
                      Ação
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const st = pushStatusPt(row.status);
                    const variant = st.tone === "success" ? "success" : st.tone === "error" ? "error" : "warning";
                    const failBorder = row.status === "FAILED" ? "border-l-4 border-l-red-500" : "border-l-4 border-l-transparent";
                    return (
                      <tr key={row.id} className={`transition-colors hover:bg-slate-50/80 ${failBorder}`}>
                        <td className="table-cell px-4 font-mono text-sm font-semibold">{orderTableId(row.orderId)}</td>
                        <td className="table-cell px-4">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                            {row.attemptCount}
                          </span>
                        </td>
                        <td className="table-cell px-4">
                          <Badge label={st.label} variant={variant} />
                        </td>
                        <td className="table-cell max-w-[220px] truncate px-4 text-sm text-slate-600" title={row.lastError ?? undefined}>
                          {row.lastError ? (row.lastError.length > 48 ? `${row.lastError.slice(0, 48)}…` : row.lastError) : "—"}
                        </td>
                        <td className="table-cell px-4 text-slate-600">{formatDate(row.updatedAt)}</td>
                        <td className="table-cell px-4 text-right">
                          <Button
                            variant={row.status === "FAILED" ? "primary" : "ghost"}
                            disabled={row.status !== "FAILED"}
                            loading={retryingId === row.id}
                            aria-label={`Retry para pedido ${row.orderId}`}
                            className="!px-3 !py-1.5 text-xs"
                            onClick={() => void retryAttempt(row.id)}
                          >
                            Retry
                          </Button>
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
