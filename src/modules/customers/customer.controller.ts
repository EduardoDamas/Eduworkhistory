import type { Request, Response } from "express";
import { getTenant } from "../auth/tenant-context.js";
import { customerService } from "./customer.service.js";
import { logger } from "../../lib/logger.js";

export const customerController = {
  async list(_req: Request, res: Response): Promise<void> {
    const { id: tenantId } = getTenant();
    const rows = await customerService.list(tenantId);
    res.json(rows);
  },

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { id: tenantId } = getTenant();
      const phone = typeof req.body?.phone === "string" ? req.body.phone.trim() : "";
      if (!phone) {
        res.status(400).json({ error: "phone is required" });
        return;
      }
      const name = typeof req.body?.name === "string" ? req.body.name.trim() : undefined;
      const metadata = req.body?.metadata;
      const row = await customerService.create(tenantId, {
        phone,
        name: name || null,
        metadata: metadata ?? {},
      });
      res.status(201).json(row);
    } catch (err) {
      if (isUniqueViolation(err)) {
        res.status(409).json({ error: "Customer with this phone already exists" });
        return;
      }
      logger.error({ err }, "customer_create_failed");
      res.status(500).json({ error: "Failed to create customer" });
    }
  },
};

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2002";
}
