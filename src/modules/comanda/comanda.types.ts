import type { OrderStatus, Prisma } from "@prisma/client";

export const COMANDA_ALLOWED_TARGET_STATUSES: readonly OrderStatus[] = [
  "ORDER_ACCEPTED",
  "ORDER_READY",
  "ORDER_DELIVERING",
  "ORDER_DELIVERED",
  "CANCELLED",
] as const;

export const COMANDA_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING_CONFIRMATION: ["ORDER_ACCEPTED", "CANCELLED"],
  ORDER_RECEIVED: ["ORDER_ACCEPTED", "CANCELLED"],
  ORDER_ACCEPTED: ["ORDER_READY"],
  ORDER_READY: ["ORDER_DELIVERING"],
  ORDER_DELIVERING: ["ORDER_DELIVERED"],
  ORDER_DELIVERED: [],
  CANCELLED: [],
};

export type ComandaPendingOrderView = {
  id: string;
  source: string;
  customer_name: string | null;
  customer_phone: string | null;
  address: string | null;
  total: string;
  items: {
    id: string;
    name: string;
    quantity: number;
    unit_price: string | null;
    metadata: Prisma.JsonValue;
  }[];
  created_at: string;
  raw_payload: Prisma.JsonValue;
};
