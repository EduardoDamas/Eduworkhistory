import type { Request, Response } from "express";
import { getTenant } from "../auth/tenant-context.js";
import { whatsappAccountService } from "./whatsapp-account.service.js";
import { logger } from "../../lib/logger.js";

function readBody(req: Request): Record<string, unknown> {
  const raw = req.body;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

function paramId(req: Request): string {
  const raw = req.params.id;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" ? value.trim() : "";
}

export const whatsappAccountController = {
  async create(req: Request, res: Response): Promise<void> {
    try {
      const { id: tenantId } = getTenant();
      const body = readBody(req);
      const row = await whatsappAccountService.createOrUpdateForTenant(tenantId, {
        accountSid: String(body.accountSid ?? ""),
        authToken: String(body.authToken ?? ""),
        whatsappFrom: String(body.whatsappFrom ?? ""),
        sandboxJoinCode:
          body.sandboxJoinCode === null || body.sandboxJoinCode === undefined
            ? null
            : String(body.sandboxJoinCode),
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
      const id = paramId(req);
      if (!id) {
        res.status(400).json({ error: "id is required" });
        return;
      }
      const body = readBody(req);
      const row = await whatsappAccountService.patchForTenant(tenantId, id, {
        accountSid: typeof body.accountSid === "string" ? body.accountSid : undefined,
        authToken: typeof body.authToken === "string" ? body.authToken : undefined,
        whatsappFrom: typeof body.whatsappFrom === "string" ? body.whatsappFrom : undefined,
        sandboxJoinCode:
          body.sandboxJoinCode === null || typeof body.sandboxJoinCode === "string"
            ? (body.sandboxJoinCode as string | null)
            : undefined,
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
      const id = paramId(req);
      if (!id) {
        res.status(400).json({ error: "id is required" });
        return;
      }
      const body = readBody(req);
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

const REQUIRED_FIELD_MESSAGES: Record<string, string> = {
  WHATSAPP_ACCOUNT_SID_REQUIRED: "accountSid is required",
  WHATSAPP_AUTH_TOKEN_REQUIRED: "authToken is required",
  WHATSAPP_FROM_REQUIRED: "whatsappFrom is required",
  WHATSAPP_TEST_SEND_TO_REQUIRED: "Field 'to' is required",
  WHATSAPP_TEST_SEND_MESSAGE_REQUIRED: "Field 'message' is required",
};

function handle(err: unknown, res: Response, logMsg: string): void {
  const msg = err instanceof Error ? err.message : "";
  if (msg in REQUIRED_FIELD_MESSAGES) {
    res.status(400).json({ error: REQUIRED_FIELD_MESSAGES[msg], code: msg });
    return;
  }
  if (msg === "WHATSAPP_ACCOUNT_INACTIVE") {
    res.status(400).json({ error: "WhatsApp account is inactive", code: msg });
    return;
  }
  if (msg === "WHATSAPP_ACCOUNT_NOT_FOUND") {
    res.status(404).json({ error: "WhatsApp account not found", code: msg });
    return;
  }
  logger.error({ err }, logMsg);
  res.status(500).json({ error: "Internal server error" });
}
