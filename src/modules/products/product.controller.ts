import type { Request, Response } from "express";
import { logger } from "../../lib/logger.js";
import { getTenant } from "../auth/tenant-context.js";
import { productService } from "./product.service.js";

export const productController = {
  async list(_req: Request, res: Response): Promise<void> {
    try {
      const { id: tenantId } = getTenant();
      const rows = await productService.list(tenantId);
      res.json(rows);
    } catch (err) {
      logger.error({ err }, "product_list_failed");
      res.status(500).json({ error: "Failed to list products" });
    }
  },

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id: tenantId } = getTenant();
      const productId = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
      if (!productId) {
        res.status(400).json({ error: "product id required" });
        return;
      }
      const row = await productService.getById(tenantId, productId);
      res.json(row);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "PRODUCT_NOT_FOUND") {
        res.status(404).json({ error: "Product not found" });
        return;
      }
      logger.error({ err }, "product_get_by_id_failed");
      res.status(500).json({ error: "Failed to load product" });
    }
  },

  async patchMapping(req: Request, res: Response): Promise<void> {
    try {
      const { id: tenantId } = getTenant();
      const productId = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
      if (!productId) {
        res.status(400).json({ error: "product id required" });
        return;
      }
      const body = (req.body ?? {}) as Record<string, unknown>;
      const row = await productService.patchMapping(tenantId, productId, {
        externalId: body.externalId,
        externalSource: body.externalSource,
        syncMetadata: body.syncMetadata,
      });
      res.json(row);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "PRODUCT_NOT_FOUND") {
        res.status(404).json({ error: "Product not found" });
        return;
      }
      if (
        [
          "INVALID_EXTERNAL_SOURCE",
          "INVALID_EXTERNAL_ID",
          "INVALID_SYNC_METADATA",
          "MAPPING_FIELDS_REQUIRED",
        ].includes(msg)
      ) {
        res.status(400).json({ error: msg });
        return;
      }
      logger.error({ err }, "product_patch_mapping_failed");
      res.status(500).json({ error: "Failed to update product mapping" });
    }
  },
};
