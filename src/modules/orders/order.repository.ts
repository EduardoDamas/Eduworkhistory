import { Prisma, type OrderStatus, type Source } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export type CreateOrderItemRow = {
  name: string;
  quantity: number;
  unitPrice: Prisma.Decimal | null;
  metadata: Prisma.InputJsonValue;
};

export type CreateOrderRow = {
  customerId: string | null;
  source: Source;
  externalOrderId: string;
  status?: OrderStatus;
  rawPayload: Prisma.InputJsonValue;
  metadata: Prisma.InputJsonValue;
  items: CreateOrderItemRow[];
};

export type OrderWithRelations = Prisma.OrderGetPayload<{
  include: { items: true; customer: true };
}>;

function sumOrderTotal(items: CreateOrderItemRow[]): Prisma.Decimal {
  let total = new Prisma.Decimal(0);
  for (const it of items) {
    if (it.unitPrice) {
      total = total.add(it.unitPrice.mul(it.quantity));
    }
  }
  return total;
}

export const orderRepository = {
  async listByTenant(tenantId: string) {
    return prisma.order.findMany({
      where: { tenantId },
      include: { items: true, customer: true },
      orderBy: { createdAt: "desc" },
    });
  },

  async listPendingConfirmation(tenantId: string) {
    return prisma.order.findMany({
      where: { tenantId, status: "PENDING_CONFIRMATION" },
      include: { items: true, customer: true },
      orderBy: { createdAt: "desc" },
    });
  },

  async createWithItems(tenantId: string, data: CreateOrderRow) {
    const total = sumOrderTotal(data.items);
    return prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          tenantId,
          customerId: data.customerId,
          source: data.source,
          externalOrderId: data.externalOrderId,
          status: data.status,
          total,
          rawPayload: data.rawPayload,
          metadata: data.metadata,
          items: {
            create: data.items.map((it) => ({
              tenantId,
              name: it.name,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              metadata: it.metadata,
            })),
          },
        },
        include: { items: true, customer: true },
      });

      await tx.orderStatusHistory.create({
        data: {
          tenantId,
          orderId: created.id,
          previousStatus: null,
          status: created.status,
          metadata: {},
        },
      });

      return created;
    });
  },

  async confirmOrder(
    tenantId: string,
    orderId: string,
    nextStatus: OrderStatus = "ORDER_RECEIVED",
  ) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, tenantId },
      });
      if (!order) throw new Error("ORDER_NOT_FOUND");
      if (order.status !== "PENDING_CONFIRMATION") throw new Error("ORDER_NOT_PENDING");

      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: nextStatus },
        include: { items: true, customer: true },
      });

      await tx.orderStatusHistory.create({
        data: {
          tenantId,
          orderId,
          previousStatus: order.status,
          status: nextStatus,
          metadata: { source: "operator_confirm" },
        },
      });

      return updated;
    });
  },

  async transitionOrderStatus(
    tenantId: string,
    orderId: string,
    expectedFrom: OrderStatus,
    nextStatus: OrderStatus,
    metadata: Prisma.InputJsonValue,
  ): Promise<{ order: OrderWithRelations; changed: boolean; previousStatus: OrderStatus }> {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, tenantId },
        include: { items: true, customer: true },
      });
      if (!order) throw new Error("ORDER_NOT_FOUND");

      if (order.status === nextStatus) {
        return { order, changed: false, previousStatus: order.status };
      }

      if (order.status !== expectedFrom) {
        throw new Error("ORDER_INVALID_TRANSITION");
      }

      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: nextStatus },
        include: { items: true, customer: true },
      });

      await tx.orderStatusHistory.create({
        data: {
          tenantId,
          orderId,
          previousStatus: order.status,
          status: nextStatus,
          metadata,
        },
      });

      return { order: updated, changed: true, previousStatus: order.status };
    });
  },
};
