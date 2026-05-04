"use client";

import { useEffect, useState } from "react";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { EmptyState } from "../../../components/ui/EmptyState";
import { Skeleton } from "../../../components/ui/Skeleton";
import { apiRequest } from "../../../lib/api";
import { formatCurrency, formatDate, truncateId } from "../../../lib/format";
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
      const response = await apiRequest<PendingResponse>("/comanda/orders/pending");
      setOrders(response.orders);
      setError(null);
    } catch (err) {
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
      toast.success("Order queued for client push");
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Orders</h1>
        <Button variant="ghost" loading={loading} onClick={() => void loadOrders()}>
          Refresh
        </Button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <Card title="Pending Orders">
          <div className="space-y-3">
            <Skeleton className="h-8 w-11/12" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-8 w-2/3" />
          </div>
        </Card>
      ) : (
      <Card title="Pending Orders">
        {!orders.length ? (
          <EmptyState icon="🧾" title="No pending orders" description="Orders will appear here once polling returns pending data." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="table-head">
                  <th scope="col" className="pb-2">Order</th>
                  <th scope="col" className="pb-2">Status</th>
                  <th scope="col" className="pb-2">Created At</th>
                  <th scope="col" className="pb-2">Total</th>
                  <th scope="col" className="pb-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="transition-colors duration-150 hover:bg-gray-50">
                    <td className="table-cell font-medium">{truncateId(order.id)}</td>
                    <td className="table-cell">
                      <Badge
                        label={order.status}
                        variant={order.status === "ORDER_ACCEPTED" ? "success" : order.statusCode > 0 ? "warning" : "neutral"}
                      />
                    </td>
                    <td className="table-cell">{formatDate(order.createdAt)}</td>
                    <td className="table-cell">{formatCurrency(order.total)}</td>
                    <td className="table-cell">
                      <Button variant="secondary" loading={pushingOrderId === order.id} onClick={() => void pushOrder(order.id)}>
                        Push
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
