import type { Request, Response } from "express";
import { getTenant } from "../auth/tenant-context.js";
import { whatsappAccountService } from "./whatsapp-account.service.js";
import { logger } from "../../lib/logger.js";

export const whatsappAccountController = {
  async create(req: Request, res: Response): Promise<void> {
    try {
      const { id: tenantId } = getTenant();
      const body = req.body as Record<string, unknown>;
      const row = await whatsappAccountService.createOrUpdateForTenant(tenantId, {
        phoneNumberId: String(body.phoneNumberId ?? ""),
        businessAccountId: String(body.businessAccountId ?? ""),
        accessToken: String(body.accessToken ?? ""),
        verifyToken: String(body.verifyToken ?? ""),
        appSecret: body.appSecret ? String(body.appSecret) : null,
        isActive: typeof body.isActive === "boolean" ? body.isActive : true,
      });
      res.status(201).json(row);
    } catch (err) {
      handle(err, res, "whatsapp_account_create_failed");
    }
  },

  async list(_req: Request, res: Response): Promise<void> {
    try {
      const { id: tenantId } = getTenant();
      const rows = await whatsappAccountService.listForTenant(tenantId);
      res.json(rows);
    } catch (err) {
      handle(err, res, "whatsapp_account_list_failed");
    }
  },

  async patch(req: Request, res: Response): Promise<void> {
    try {
      const { id: tenantId } = getTenant();
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!id) {
        res.status(400).json({ error: "id is required" });
        return;
      }
      const body = req.body as Record<string, unknown>;
      const row = await whatsappAccountService.patchForTenant(tenantId, id, {
        phoneNumberId: typeof body.phoneNumberId === "string" ? body.phoneNumberId : undefined,
        businessAccountId:
          typeof body.businessAccountId === "string" ? body.businessAccountId : undefined,
        accessToken: typeof body.accessToken === "string" ? body.accessToken : undefined,
        verifyToken: typeof body.verifyToken === "string" ? body.verifyToken : undefined,
        appSecret: body.appSecret === null || typeof body.appSecret === "string" ? (body.appSecret as string | null) : undefined,
        isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
      });
      res.json(row);
    } catch (err) {
      handle(err, res, "whatsapp_account_patch_failed");
    }
  },

  async testSend(req: Request, res: Response): Promise<void> {
    try {
      const { id: tenantId } = getTenant();
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!id) {
        res.status(400).json({ error: "id is required" });
        return;
      }
      const body = req.body as Record<string, unknown>;
      const result = await whatsappAccountService.testSendForTenant(tenantId, id, {
        to: typeof body.to === "string" ? body.to : "",
        message: typeof body.message === "string" ? body.message : "",
      });
      res.status(200).json(result);
    } catch (err) {
      handle(err, res, "whatsapp_account_test_send_failed");
    }
  },
};

function handle(err: unknown, res: Response, logMsg: string): void {
  const msg = err instanceof Error ? err.message : "";
  if (msg.endsWith("_REQUIRED")) {
    res.status(400).json({ error: msg });
    return;
  }
  if (msg === "WHATSAPP_ACCOUNT_INACTIVE") {
    res.status(400).json({ error: "WhatsApp account is inactive" });
    return;
  }
  if (msg === "WHATSAPP_ACCOUNT_NOT_FOUND") {
    res.status(404).json({ error: "WhatsApp account not found" });
    return;
  }
  logger.error({ err }, logMsg);
  res.status(500).json({ error: "Internal server error" });
}
