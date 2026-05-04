"use client";

import { useEffect, useState } from "react";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { Loader } from "../../../components/ui/Loader";
import { apiRequest } from "../../../lib/api";
import { formatDate } from "../../../lib/format";
import { useToast } from "../../../lib/useToast";

type Billing = {
  plan: "FREE" | "PRO" | "ENTERPRISE";
  status: "ACTIVE" | "TRIAL" | "CANCELED" | "PAST_DUE";
  usageCount: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
};

export default function BillingPage() {
  const toast = useToast();
  const [billing, setBilling] = useState<Billing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<Billing>("/comanda/billing")
      .then(setBilling)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load billing"))
      .finally(() => setLoading(false));
  }, []);

  async function onUpgrade() {
    try {
      const data = await apiRequest<{ url: string }>("/billing/create-checkout-session", {
        method: "POST",
        body: JSON.stringify({ plan: "PRO" }),
      });
      if (data.url && data.url !== "#") {
        window.location.href = data.url;
      } else {
        toast.success("Checkout session created (demo mode)");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start checkout";
      setError(message);
      toast.error(message);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Billing</h1>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Loader />
          Loading billing...
        </div>
      ) : null}

      <Card title="Subscription">
        <div className="space-y-2 text-sm">
          <p>Plan: <strong>{billing?.plan ?? "-"}</strong></p>
          <p>
            Status:{" "}
            <Badge
              label={billing?.status ?? "-"}
              variant={billing?.status === "ACTIVE" || billing?.status === "TRIAL" ? "success" : "warning"}
            />
          </p>
          <p>Usage: {billing?.usageCount ?? 0} pushes</p>
          <p>Cycle start: {billing?.currentPeriodStart ? formatDate(billing.currentPeriodStart) : "-"}</p>
          <p>Cycle end: {billing?.currentPeriodEnd ? formatDate(billing.currentPeriodEnd) : "-"}</p>
        </div>
        <div className="mt-4">
          <Button variant="secondary" onClick={() => void onUpgrade()}>
            Upgrade to PRO
          </Button>
        </div>
      </Card>
    </div>
  );
}
