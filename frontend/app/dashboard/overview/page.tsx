"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "../../../components/ui/Badge";
import { Card } from "../../../components/ui/Card";
import { EmptyState } from "../../../components/ui/EmptyState";
import { Skeleton } from "../../../components/ui/Skeleton";
import { apiRequest } from "../../../lib/api";
import { formatCurrency, formatDate, truncateId } from "../../../lib/format";

type Billing = {
  plan: string;
  status: string;
  usageCount: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
};

type Order = {
  id: string;
  status: string;
  statusCode: number;
  total: number;
  createdAt: string;
};

type OrdersResponse = {
  orders: Order[];
  meta: { count: number; polledAt: string };
};

type PushAttempt = {
  id: string;
  orderId: string;
  status: "SUCCESS" | "FAILED" | "RETRYING" | string;
  attemptCount: number;
  updatedAt: string;
};

export default function OverviewPage() {
  const [billing, setBilling] = useState<Billing | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [attempts, setAttempts] = useState<PushAttempt[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiRequest<Billing>("/comanda/billing"),
      apiRequest<OrdersResponse>("/comanda/orders/pending"),
      apiRequest<PushAttempt[]>("/comanda/push-attempts?limit=8"),
    ])
      .then(([billingData, ordersData, attemptsData]) => {
        setBilling(billingData);
        setOrders(ordersData.orders);
        setAttempts(attemptsData);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  const metrics = useMemo(() => {
    const success = attempts.filter((x) => x.status === "SUCCESS").length;
    const failed = attempts.filter((x) => x.status === "FAILED").length;
    const retrying = attempts.filter((x) => x.status === "RETRYING").length;
    return { success, failed, retrying };
  }, [attempts]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Overview</h1>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <Skeleton className="mb-2 h-4 w-1/2" />
            <Skeleton className="h-10 w-2/3" />
          </Card>
          <Card>
            <Skeleton className="mb-2 h-4 w-1/3" />
            <Skeleton className="h-10 w-1/2" />
          </Card>
          <Card>
            <Skeleton className="mb-2 h-4 w-2/3" />
            <Skeleton className="h-10 w-1/3" />
          </Card>
          <Card>
            <Skeleton className="mb-2 h-4 w-1/4" />
            <Skeleton className="h-10 w-3/5" />
          </Card>
        </div>
      ) : (
      <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card title="Total Orders">
          <p className="text-3xl font-semibold">{orders.length}</p>
        </Card>
        <Card title="Pending Pushes">
          <p className="text-3xl font-semibold">{metrics.retrying}</p>
          <div className="mt-2">
            <Badge label="RETRYING" variant="warning" />
          </div>
        </Card>
        <Card title="Successful Pushes">
          <p className="text-3xl font-semibold">{metrics.success}</p>
          <div className="mt-2">
            <Badge label="SUCCESS" variant="success" />
          </div>
        </Card>
        <Card title="Failed Pushes">
          <p className="text-3xl font-semibold">{metrics.failed}</p>
          <div className="mt-2">
            <Badge label="FAILED" variant="error" />
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Recent Activity" subtitle="Latest push attempt status">
          {attempts.length === 0 ? (
            <EmptyState icon="🕒" title="No recent activity" description="Push attempts will be listed here once you start sending orders." />
          ) : (
            <ul className="space-y-2">
              {attempts.slice(0, 5).map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 transition-colors duration-150 hover:bg-gray-50"
                >
                  <div>
                    <p className="text-sm font-medium">{truncateId(item.orderId)}</p>
                    <p className="text-xs text-slate-500">{formatDate(item.updatedAt)}</p>
                  </div>
                  <Badge
                    label={item.status}
                    variant={item.status === "SUCCESS" ? "success" : item.status === "FAILED" ? "error" : "warning"}
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Billing Snapshot">
          <div className="space-y-2 text-sm">
            <p>
              Plan: <span className="font-semibold">{billing?.plan ?? "-"}</span>
            </p>
            <p>
              Status:{" "}
              <Badge
                label={billing?.status ?? "-"}
                variant={billing?.status === "ACTIVE" || billing?.status === "TRIAL" ? "success" : "warning"}
              />
            </p>
            <p>Usage: {billing?.usageCount ?? 0} pushes</p>
            {orders[0] ? <p>Latest order total: {formatCurrency(orders[0].total)}</p> : null}
          </div>
        </Card>
      </div>

      <Card title="Demo Flow" subtitle="Visao rapida para apresentacao ao cliente">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <div className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2">
            <span>✔</span>
            <span className="text-sm">Receive order</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2">
            <span>✔</span>
            <span className="text-sm">Map order</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2">
            <span>✔</span>
            <span className="text-sm">Push to client DB</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2">
            <span>✔</span>
            <span className="text-sm">Retry on failure</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2">
            <span>✔</span>
            <span className="text-sm">Monitor attempts</span>
          </div>
        </div>
      </Card>
      </>
      )}
    </div>
  );
}
