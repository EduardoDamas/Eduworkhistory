"use client";

import { useEffect, useState } from "react";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { EmptyState } from "../../../components/ui/EmptyState";
import { Skeleton } from "../../../components/ui/Skeleton";
import { apiRequest } from "../../../lib/api";
import { formatDate, truncateId } from "../../../lib/format";
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
      toast.success("Retry requested");
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Push attempts</h1>
        <Button variant="ghost" loading={loading} onClick={() => void loadAttempts()}>
          Refresh
        </Button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <Card title="Recent attempts">
          <div className="space-y-3">
            <Skeleton className="h-8 w-10/12" />
            <Skeleton className="h-8 w-4/5" />
            <Skeleton className="h-8 w-1/2" />
          </div>
        </Card>
      ) : (
      <Card title="Recent attempts">
        {!rows.length ? (
          <EmptyState icon="🔁" title="No push attempts yet" description="Attempts will appear here after orders are pushed." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="table-head">
                  <th scope="col" className="pb-2">Order</th>
                  <th scope="col" className="pb-2">Status</th>
                  <th scope="col" className="pb-2">Attempts</th>
                  <th scope="col" className="pb-2">Last error</th>
                  <th scope="col" className="pb-2">Updated</th>
                  <th scope="col" className="pb-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="transition-colors duration-150 hover:bg-gray-50">
                    <td className="table-cell font-medium">{truncateId(row.orderId)}</td>
                    <td className="table-cell">
                      <Badge
                        label={row.status}
                        variant={row.status === "SUCCESS" ? "success" : row.status === "FAILED" ? "error" : "warning"}
                      />
                    </td>
                    <td className="table-cell">{row.attemptCount}</td>
                    <td className="table-cell">{truncateId(row.lastError ?? "-", 16)}</td>
                    <td className="table-cell">{formatDate(row.updatedAt)}</td>
                    <td className="table-cell">
                      <Button
                        variant={row.status === "FAILED" ? "primary" : "ghost"}
                        disabled={row.status !== "FAILED"}
                        loading={retryingId === row.id}
                        aria-label={`Retry push attempt for ${row.orderId}`}
                        onClick={() => void retryAttempt(row.id)}
                      >
                        Retry
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      )}
    </div>
  );
}
