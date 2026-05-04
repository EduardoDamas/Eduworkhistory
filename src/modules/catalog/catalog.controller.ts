import type { Request, Response } from "express";
import { getTenant } from "../auth/tenant-context.js";
import { catalogService } from "./catalog.service.js";

export const catalogController = {
  async list(_req: Request, res: Response): Promise<void> {
    const { id: tenantId } = getTenant();
    const rows = await catalogService.listForTenant(tenantId);
    res.json(rows);
  },
};
