import type { Request, Response } from "express";
import { OrderStatus } from "@prisma/client";
import { getTenant } from "../auth/tenant-context.js";
import { orderService } from "./order.service.js";
import { logger } from "../../lib/logger.js";
import { enqueueFoundationJob } from "../jobs/default.queue.js";

export const orderController = {
  async transition(
    req: Request,
    res: Response,
    action: "accept" | "reject" | "ready" | "delivering" | "delivered",
  ): Promise<void> {
    try {
      const { id: tenantId } = getTenant();
      const orderId = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
      if (!orderId) {
        res.status(400).json({ error: "order id required" });
        return;
      }
      const row = await orderService.transitionByAction(tenantId, orderId, action);
      res.json(row);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "ORDER_NOT_FOUND") {
        res.status(404).json({ error: "Order not found" });
        return;
      }
      if (msg === "ORDER_INVALID_TRANSITION") {
        logger.warn({ err, action }, "order_status_invalid_transition");
        res.status(400).json({ error: "Invalid order status transition" });
        return;
      }
      if (msg === "ORDER_UNKNOWN_ACTION") {
        res.status(400).json({ error: "Unknown action" });
        return;
      }
      logger.error({ err, action }, "order_status_update_failed");
      res.status(500).json({ error: "Failed to update order status" });
    }
  },

  async listPendingConfirmation(_req: Request, res: Response): Promise<void> {
    const { id: tenantId } = getTenant();
    const rows = await orderService.listPendingConfirmation(tenantId);
    res.json(rows);
  },

  async confirm(req: Request, res: Response): Promise<void> {
    try {
      const { id: tenantId } = getTenant();
      const orderId = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
      if (!orderId) {
        res.status(400).json({ error: "order id required" });
        return;
      }
      const body = req.body as { status?: string } | undefined;
      const next =
        body?.status === "ORDER_ACCEPTED" ? OrderStatus.ORDER_ACCEPTED : OrderStatus.ORDER_RECEIVED;
      const row = await orderService.confirm(tenantId, orderId, next);
      res.json(row);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "ORDER_NOT_FOUND") {
        res.status(404).json({ error: "Order not found" });
        return;
      }
      if (msg === "ORDER_NOT_PENDING") {
        res.status(409).json({ error: "Order is not pending confirmation" });
        return;
      }
      logger.error({ err }, "order_confirm_failed");
      res.status(500).json({ error: "Failed to confirm order" });
    }
  },

  async list(_req: Request, res: Response): Promise<void> {
    const { id: tenantId } = getTenant();
    const rows = await orderService.list(tenantId);
    res.json(rows);
  },

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { id: tenantId } = getTenant();
      const row = await orderService.create(tenantId, req.body);
      void enqueueFoundationJob({
        kind: "order.created",
        tenantId,
        orderId: row.id,
      }).catch((err: unknown) => {
        logger.error({ err, orderId: row.id }, "enqueue_after_order_failed");
      });
      res.status(201).json(row);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "INVALID_SOURCE") {
        res.status(400).json({ error: "Invalid source" });
        return;
      }
      if (msg === "MISSING_EXTERNAL_ORDER_ID") {
        res.status(400).json({ error: "externalOrderId is required" });
        return;
      }
      if (msg === "ITEMS_REQUIRED") {
        res.status(400).json({ error: "items must be a non-empty array" });
        return;
      }
      if (msg === "ITEM_NAME_REQUIRED") {
        res.status(400).json({ error: "Each item requires a non-empty name" });
        return;
      }
      if (msg === "INVALID_CUSTOMER") {
        res.status(400).json({ error: "customerId is not valid for this tenant" });
        return;
      }
      if (isUniqueViolation(err)) {
        res.status(409).json({ error: "Order already exists for this source and external id" });
        return;
      }
      if (isForeignKeyViolation(err)) {
        res.status(400).json({ error: "Invalid customer reference" });
        return;
      }
      logger.error({ err }, "order_create_failed");
      res.status(500).json({ error: "Failed to create order" });
    }
  },
};

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2002";
}

function isForeignKeyViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2003";
}
