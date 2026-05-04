export type LegacyExternalSource = "FIREBIRD" | "MSSQL" | "MANUAL" | "UNKNOWN";

export type LegacyOrderExportContract = {
  orderId: string;
  /** Platform order external id (unique per tenant+source) for legacy idempotency. */
  externalOrderId: string;
  tenantId: string;
  source: string;
  status: string;
  customer: {
    id: string | null;
    name: string | null;
    phone: string | null;
    address: string | null;
  };
  items: {
    productId: string | null;
    externalId: string | null;
    externalSource: LegacyExternalSource;
    name: string;
    quantity: number;
    unitPrice: number | null;
  }[];
  total: number;
  createdAt: string;
  metadata: Record<string, unknown>;
};

export type LegacyAdapterResult = {
  ok: boolean;
  adapter: "FIREBIRD" | "MSSQL" | "MOCK";
  message: string;
  exportedAt: string;
};

export interface LegacyAdapter {
  exportOrder(payload: LegacyOrderExportContract): Promise<LegacyAdapterResult>;
}
