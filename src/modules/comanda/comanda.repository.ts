import type { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { COMANDA_TRANSITIONS } from "./comanda.types.js";

export const comandaRepository = {
  async listPendingOrders(tenantId: string) {
    return prisma.order.findMany({
      where: {
        tenantId,
        status: { in: ["PENDING_CONFIRMATION", "ORDER_RECEIVED"] },
      },
      include: { customer: true, items: true },
      orderBy: { createdAt: "asc" },
    });
  },

  async findOrderById(tenantId: string, id: string) {
    return prisma.order.findFirst({
      where: { tenantId, id },
      include: { customer: true, items: true, statusHistory: { orderBy: { createdAt: "asc" } } },
    });
  },

  async updateOrderStatusFromComanda(
    tenantId: string,
    orderId: string,
    targetStatus: OrderStatus,
  ) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, tenantId },
        include: { customer: true, items: true },
      });
      if (!order) throw new Error("ORDER_NOT_FOUND");

      if (order.status === targetStatus) {
        return { changed: false, order };
      }

      const allowedTargets = COMANDA_TRANSITIONS[order.status] ?? [];
      if (!allowedTargets.includes(targetStatus)) {
        throw new Error(
          `ORDER_INVALID_TRANSITION: cannot move from ${order.status} to ${targetStatus}`,
        );
      }

      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: targetStatus },
        include: { customer: true, items: true },
      });

      await tx.orderStatusHistory.create({
        data: {
          tenantId,
          orderId,
          previousStatus: order.status,
          status: targetStatus,
          metadata: { source: "comanda_status_update" },
        },
      });

      return { changed: true, order: updated };
    });
  },

  async listCatalog(tenantId: string) {
    return prisma.product.findMany({
      where: { tenantId },
      orderBy: { displayCode: "asc" },
    });
  },

  async updateProductAvailability(tenantId: string, productId: string, active: boolean) {
    const product = await prisma.product.findFirst({ where: { id: productId, tenantId } });
    if (!product) throw new Error("PRODUCT_NOT_FOUND");
    return prisma.product.update({
      where: { id: productId },
      data: { active },
    });
  },

  async createIntegrationLog(input: {
    tenantId: string;
    action: string;
    entityType: string;
    entityId?: string | null;
    payload?: Prisma.InputJsonValue;
    result?: Prisma.InputJsonValue;
    status: "SUCCESS" | "ERROR";
    errorMessage?: string | null;
  }) {
    return prisma.comandaIntegrationLog.create({
      data: {
        tenantId: input.tenantId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        payload: input.payload ?? {},
        result: input.result ?? {},
        status: input.status,
        errorMessage: input.errorMessage ?? null,
      },
    });
  },
};
