import type { Request, Response } from "express";
import { tenantService } from "./tenant.service.js";
import { getTenant } from "../auth/tenant-context.js";
import { logger } from "../../lib/logger.js";

export const tenantController = {
  async create(req: Request, res: Response): Promise<void> {
    try {
      const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
      if (!name) {
        res.status(400).json({ error: "name is required" });
        return;
      }
      const tenant = await tenantService.createTenant(name);
      res.status(201).json({
        id: tenant.id,
        name: tenant.name,
        apiKey: tenant.apiKey,
        createdAt: tenant.createdAt,
      });
    } catch (err) {
      logger.error({ err }, "tenant_create_failed");
      res.status(500).json({ error: "Failed to create tenant" });
    }
  },

  async listMe(_req: Request, res: Response): Promise<void> {
    const { id } = getTenant();
    const tenant = await tenantService.getCurrentTenant(id);
    if (!tenant) {
      res.status(404).json({ error: "Tenant not found" });
      return;
    }
    res.json([
      {
        id: tenant.id,
        name: tenant.name,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
      },
    ]);
  },
};
