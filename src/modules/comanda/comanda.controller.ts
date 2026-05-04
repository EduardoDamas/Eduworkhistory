import type { Request, Response } from "express";
import { logger } from "../../lib/logger.js";
import { getTenant } from "../auth/tenant-context.js";
import { comandaService } from "./comanda.service.js";

export const comandaController = {
  async listPendingOrders(_req: Request, res: Response): Promise<void> {
    try {
      const { id: tenantId } = getTenant();
      const rows = await comandaService.listPendingOrders(tenantId);
      res.json(rows);
    } catch (err) {
      logger.error({ err }, "comanda_pending_orders_failed");
      res.status(500).json({ error: "Failed to load pending orders" });
    }
  },

  async getOrder(req: Request, res: Response): Promise<void> {
    try {
      const { id: tenantId } = getTenant();
      const orderId = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
      if (!orderId) {
        res.status(400).json({ error: "order id required" });
        return;
      }
      const row = await comandaService.getOrderById(tenantId, orderId);
      res.json(row);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "ORDER_NOT_FOUND") {
        res.status(404).json({ error: "Order not found" });
        return;
      }
      logger.error({ err }, "comanda_get_order_failed");
      res.status(500).json({ error: "Failed to load order" });
    }
  },

  async updateOrderStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id: tenantId } = getTenant();
      const orderId = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
      if (!orderId) {
        res.status(400).json({ error: "order id required" });
        return;
      }
      const body = req.body as { status?: unknown } | undefined;
      const updated = await comandaService.updateOrderStatus(tenantId, orderId, body?.status);
      res.json(updated);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "ORDER_NOT_FOUND") {
        res.status(404).json({ error: "Order not found" });
        return;
      }
      if (msg.startsWith("INVALID_STATUS:")) {
        res.status(400).json({ error: msg.replace("INVALID_STATUS: ", "") });
        return;
      }
      if (msg.startsWith("ORDER_INVALID_TRANSITION:")) {
        res.status(400).json({ error: msg.replace("ORDER_INVALID_TRANSITION: ", "") });
        return;
      }
      logger.error({ err }, "comanda_update_order_status_failed");
      res.status(500).json({ error: "Failed to update order status" });
    }
  },

  async updateProductAvailability(req: Request, res: Response): Promise<void> {
    try {
      const { id: tenantId } = getTenant();
      const productId = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
      if (!productId) {
        res.status(400).json({ error: "product id required" });
        return;
      }
      const body = req.body as { active?: unknown } | undefined;
      const row = await comandaService.updateProductAvailability(tenantId, productId, body?.active);
      res.json(row);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "PRODUCT_NOT_FOUND") {
        res.status(404).json({ error: "Product not found" });
        return;
      }
      if (msg === "INVALID_ACTIVE_FLAG") {
        res.status(400).json({ error: "active must be a boolean" });
        return;
      }
      logger.error({ err }, "comanda_product_availability_failed");
      res.status(500).json({ error: "Failed to update product availability" });
    }
  },

  async listCatalog(_req: Request, res: Response): Promise<void> {
    try {
      const { id: tenantId } = getTenant();
      const rows = await comandaService.listCatalog(tenantId);
      res.json(rows);
    } catch (err) {
      logger.error({ err }, "comanda_catalog_list_failed");
      res.status(500).json({ error: "Failed to load catalog" });
    }
  },
};
