import type { OrderStatus } from "@prisma/client";
import type { ComandaPendingOrderView } from "./comanda.types.js";
import { COMANDA_ALLOWED_TARGET_STATUSES } from "./comanda.types.js";
import { comandaRepository } from "./comanda.repository.js";
import { legacyIntegrationService } from "../legacy_integrations/legacy-integration.service.js";

export const comandaService = {
  async listPendingOrders(tenantId: string): Promise<ComandaPendingOrderView[]> {
    try {
      const rows = await comandaRepository.listPendingOrders(tenantId);
      const mapped = rows.map(mapPendingOrder);
      await comandaRepository.createIntegrationLog({
        tenantId,
        action: "order_pulled",
        entityType: "order",
        payload: { statuses: ["PENDING_CONFIRMATION", "ORDER_RECEIVED"] },
        result: { count: mapped.length },
        status: "SUCCESS",
      });
      return mapped;
    } catch (err) {
      await comandaRepository.createIntegrationLog({
        tenantId,
        action: "order_pulled",
        entityType: "order",
        status: "ERROR",
        errorMessage: err instanceof Error ? err.message : "unknown_error",
      });
      throw err;
    }
  },

  async getOrderById(tenantId: string, id: string) {
    try {
      const row = await comandaRepository.findOrderById(tenantId, id);
      if (!row) throw new Error("ORDER_NOT_FOUND");
      await comandaRepository.createIntegrationLog({
        tenantId,
        action: "order_pulled",
        entityType: "order",
        entityId: id,
        result: { status: row.status },
        status: "SUCCESS",
      });
      return row;
    } catch (err) {
      await comandaRepository.createIntegrationLog({
        tenantId,
        action: "order_pulled",
        entityType: "order",
        entityId: id,
        status: "ERROR",
        errorMessage: err instanceof Error ? err.message : "unknown_error",
      });
      throw err;
    }
  },

  async updateOrderStatus(tenantId: string, orderId: string, status: unknown) {
    const target = parseTargetStatus(status);
    if (!target) {
      throw new Error(
        `INVALID_STATUS: supported statuses are ${COMANDA_ALLOWED_TARGET_STATUSES.join(", ")}`,
      );
    }
    try {
      const result = await comandaRepository.updateOrderStatusFromComanda(tenantId, orderId, target);
      await comandaRepository.createIntegrationLog({
        tenantId,
        action: "order_status_updated",
        entityType: "order",
        entityId: orderId,
        payload: { status: target },
        result: { changed: result.changed, currentStatus: result.order.status },
        status: "SUCCESS",
      });
      if (result.changed && result.order.status === "ORDER_ACCEPTED") {
        try {
          await legacyIntegrationService.exportOrder(result.order.id, tenantId);
        } catch {
          // Export errors are logged by legacy service and must not block accepted status.
        }
      }
      return result;
    } catch (err) {
      await comandaRepository.createIntegrationLog({
        tenantId,
        action: "order_status_updated",
        entityType: "order",
        entityId: orderId,
        payload: { status: target },
        status: "ERROR",
        errorMessage: err instanceof Error ? err.message : "unknown_error",
      });
      throw err;
    }
  },

  async updateProductAvailability(tenantId: string, productId: string, active: unknown) {
    if (typeof active !== "boolean") throw new Error("INVALID_ACTIVE_FLAG");
    try {
      const product = await comandaRepository.updateProductAvailability(tenantId, productId, active);
      await comandaRepository.createIntegrationLog({
        tenantId,
        action: "product_availability_updated",
        entityType: "product",
        entityId: productId,
        payload: { active },
        result: { active: product.active },
        status: "SUCCESS",
      });
      return product;
    } catch (err) {
      await comandaRepository.createIntegrationLog({
        tenantId,
        action: "product_availability_updated",
        entityType: "product",
        entityId: productId,
        payload: { active },
        status: "ERROR",
        errorMessage: err instanceof Error ? err.message : "unknown_error",
      });
      throw err;
    }
  },

  async listCatalog(tenantId: string) {
    const rows = await comandaRepository.listCatalog(tenantId);
    return rows.map((row) => ({
      id: row.id,
      displayCode: row.displayCode,
      name: row.name,
      price: row.price.toString(),
      active: row.active,
      externalId: row.externalId,
      externalSource: row.externalSource,
      syncMetadata: row.syncMetadata ?? {},
    }));
  },

  async listPushAttempts(tenantId: string, limit: number) {
    const rows = await comandaRepository.listClientPushAttempts(tenantId, limit);
    return rows.map((row) => ({
      id: row.id,
      orderId: row.orderId,
      status: row.status,
      attemptCount: row.attemptCount,
      lastError: row.lastError,
      updatedAt: row.updatedAt.toISOString(),
    }));
  },

  async retryPushAttempt(tenantId: string, attemptId: string): Promise<{ queued: true }> {
    const attempt = await comandaRepository.findClientPushAttempt(tenantId, attemptId);
    if (!attempt) throw new Error("PUSH_ATTEMPT_NOT_FOUND");
    if (attempt.status !== "FAILED") throw new Error("PUSH_ATTEMPT_NOT_RETRYABLE");
    await legacyIntegrationService.exportOrder(attempt.orderId, tenantId);
    return { queued: true };
  },
};

function parseTargetStatus(value: unknown): OrderStatus | null {
  if (typeof value !== "string") return null;
  return (COMANDA_ALLOWED_TARGET_STATUSES as readonly string[]).includes(value)
    ? (value as OrderStatus)
    : null;
}

function mapPendingOrder(
  row: Awaited<ReturnType<typeof comandaRepository.listPendingOrders>>[number],
): ComandaPendingOrderView {
  const metadata = row.metadata as Record<string, unknown> | null;
  const address =
    metadata && typeof metadata.address === "string" && metadata.address.trim()
      ? metadata.address
      : null;

  return {
    id: row.id,
    source: row.source,
    customer_name: row.customer?.name ?? null,
    customer_phone: row.customer?.phone ?? null,
    address,
    total: row.total.toString(),
    items: row.items.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unit_price: item.unitPrice?.toString() ?? null,
      metadata: item.metadata,
    })),
    created_at: row.createdAt.toISOString(),
    raw_payload: row.rawPayload,
  };
}
