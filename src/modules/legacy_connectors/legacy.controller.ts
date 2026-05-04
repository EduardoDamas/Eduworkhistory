import type { Request, Response } from "express";
import { logger } from "../../lib/logger.js";
import { getTenant } from "../auth/tenant-context.js";
import { legacyConfigService } from "./legacy-config.service.js";
import { legacyExportService } from "./legacy-export.service.js";

export const legacyController = {
  async createConfig(req: Request, res: Response): Promise<void> {
    try {
      const { id: tenantId } = getTenant();
      const row = await legacyConfigService.create(tenantId, (req.body ?? {}) as Record<string, unknown>);
      res.status(201).json(row);
    } catch (err) {
      handle(err, res, "legacy_config_create_failed");
    }
  },

  async listConfigs(_req: Request, res: Response): Promise<void> {
    try {
      const { id: tenantId } = getTenant();
      const rows = await legacyConfigService.list(tenantId);
      res.json(rows);
    } catch (err) {
      handle(err, res, "legacy_config_list_failed");
    }
  },

  async configHealth(req: Request, res: Response): Promise<void> {
    try {
      const { id: tenantId } = getTenant();
      const id = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
      if (!id) {
        res.status(400).json({ error: "id is required" });
        return;
      }
      const result = await legacyConfigService.healthCheck(tenantId, id);
      res.json(result);
    } catch (err) {
      handle(err, res, "legacy_config_health_failed");
    }
  },

  async patchConfig(req: Request, res: Response): Promise<void> {
    try {
      const { id: tenantId } = getTenant();
      const id = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
      if (!id) {
        res.status(400).json({ error: "id is required" });
        return;
      }
      const row = await legacyConfigService.patch(tenantId, id, (req.body ?? {}) as Record<string, unknown>);
      res.json(row);
    } catch (err) {
      handle(err, res, "legacy_config_patch_failed");
    }
  },

  async listAttempts(_req: Request, res: Response): Promise<void> {
    try {
      const { id: tenantId } = getTenant();
      const rows = await legacyExportService.listAttempts(tenantId);
      res.json(rows);
    } catch (err) {
      handle(err, res, "legacy_attempt_list_failed");
    }
  },

  async getAttempt(req: Request, res: Response): Promise<void> {
    try {
      const { id: tenantId } = getTenant();
      const id = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
      if (!id) {
        res.status(400).json({ error: "id is required" });
        return;
      }
      const row = await legacyExportService.getAttempt(tenantId, id);
      res.json(row);
    } catch (err) {
      handle(err, res, "legacy_attempt_get_failed");
    }
  },

  async retryAttempt(req: Request, res: Response): Promise<void> {
    try {
      const { id: tenantId } = getTenant();
      const id = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
      if (!id) {
        res.status(400).json({ error: "id is required" });
        return;
      }
      const row = await legacyExportService.enqueueManualRetry(tenantId, id);
      res.status(202).json({ queued: true, attemptId: row.id, status: row.status });
    } catch (err) {
      handle(err, res, "legacy_attempt_retry_failed");
    }
  },
};

function handle(err: unknown, res: Response, logMsg: string) {
  const msg = err instanceof Error ? err.message : "";
  if (
    [
      "INVALID_LEGACY_SOURCE",
      "LEGACY_CONFIG_HOST_REQUIRED",
      "LEGACY_CONFIG_PORT_REQUIRED",
      "LEGACY_CONFIG_DATABASE_REQUIRED",
      "LEGACY_CONFIG_USERNAME_REQUIRED",
      "LEGACY_CONFIG_PASSWORD_REQUIRED",
      "INVALID_LEGACY_OPTIONS",
      "LEGACY_CONFIG_PATCH_EMPTY",
    ].includes(msg)
  ) {
    res.status(400).json({ error: msg });
    return;
  }
  if (msg === "LEGACY_CONFIG_NOT_FOUND" || msg === "LEGACY_ATTEMPT_NOT_FOUND") {
    res.status(404).json({ error: "Not found" });
    return;
  }
  logger.error({ err }, logMsg);
  res.status(500).json({ error: "Internal server error" });
}
