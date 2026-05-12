import { createHmac, timingSafeEqual } from "node:crypto";
import { Source } from "@prisma/client";
import type { Request } from "express";
import { env } from "../../config/env.js";
import { stableJsonStringify, sha256Hex } from "../../lib/stable-json.js";
import { logger } from "../../lib/logger.js";
import { resolveTenantFromApiKey } from "../auth/middleware.js";
import { runWithTenant } from "../auth/tenant-context.js";
import { inboundEventService } from "../inbound_events/inbound-event.service.js";
import { whatsappAccountRepository } from "../whatsapp_accounts/whatsapp-account.repository.js";
import { extractWhatsAppPhoneNumberId } from "../whatsapp/whatsapp-payload.js";
import type { IngestWebhookResult, WebhookSourcePath, WebhookTenantResolution } from "./webhook.types.js";

const PATH_TO_SOURCE: Record<WebhookSourcePath, Source> = {
  whatsapp: Source.WHATSAPP,
  ifood: Source.IFOOD,
  "99food": Source.NINETY_NINE,
};

export const webhookService = {
  async handleWebhook(path: WebhookSourcePath, req: Request): Promise<IngestWebhookResult> {
    const source = PATH_TO_SOURCE[path];
    const body = req.body;

    logger.info({ source, path }, "webhook_received");

    const hasHeaderId = Boolean(headerId(req));
    validatePayload(path, body, hasHeaderId);

    if (path === "whatsapp") {
      await maybeValidateWhatsAppSignature(req, body);
    }

    const externalEventId = resolveExternalEventId(path, source, body, req);
    const tenantResolution = await resolveWebhookTenant(path, req, body);

    const result = await runWithTenant(
      {
        id: tenantResolution.tenantId,
        name: `tenant:${tenantResolution.tenantId}`,
        apiKey: "resolved_via_webhook",
        resolvedBy: tenantResolution.resolvedBy,
        whatsappPhoneNumberId:
          tenantResolution.resolvedBy === "phone_number_id"
            ? extractWhatsAppPhoneNumberId(body) ?? undefined
            : undefined,
      },
      () =>
        inboundEventService.ingest({
          tenantId: tenantResolution.tenantId,
          source,
          payload: body,
          externalEventId,
        }),
    );

    if (result.duplicate) {
      return {
        ok: true,
        inboundEventId: result.inboundEventId,
        duplicate: true,
        state: "DUPLICATE",
      };
    }

    return {
      ok: true,
      inboundEventId: result.inboundEventId,
      duplicate: false,
      state: "QUEUED",
    };
  },

  async verifyWhatsAppWebhook(
    mode: string | undefined,
    verifyToken: string | undefined,
    challenge: string | undefined,
  ): Promise<string | null> {
    if (mode !== "subscribe" || !verifyToken || !challenge) return null;
    const account = await whatsappAccountRepository.findByVerifyToken(verifyToken);
    if (!account) return null;
    return challenge;
  },

  handleTwilioWhatsapp(body: unknown): { ok: true; accepted: true } {
    const payload = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
    const sender = asString(payload.From);
    const text = asString(payload.Body);
    const messageSid = asString(payload.MessageSid);

    logger.info(
      {
        provider: "twilio",
        channel: "whatsapp",
        sender,
        body: text,
        messageSid,
        twilioEnabled: env.TWILIO_ENABLED,
      },
      "twilio_whatsapp_inbound_received",
    );

    return { ok: true, accepted: true };
  },
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function validatePayload(path: WebhookSourcePath, body: unknown, hasHeaderId: boolean): void {
  if (body === null || body === undefined || typeof body !== "object") {
    throw new WebhookValidationError("JSON object body is required");
  }
  const o = body as Record<string, unknown>;
  if (Array.isArray(body)) {
    throw new WebhookValidationError("JSON object body is required");
  }
  if (path === "whatsapp") {
    if (hasHeaderId) return;
    if (typeof o.object !== "string" && !Array.isArray(o.entry)) {
      throw new WebhookValidationError("WhatsApp payload must include object or entry (or send x-external-event-id)");
    }
  }
  if (path === "ifood") {
    if (hasHeaderId) return;
    if (!("id" in o) && !("orderId" in o) && !("event" in o)) {
      throw new WebhookValidationError(
        "iFood payload must include id, orderId, or event (or send x-external-event-id / x-idempotency-key)",
      );
    }
  }
  if (path === "99food") {
    if (hasHeaderId) return;
    if (!("event_id" in o) && !("eventId" in o) && !("id" in o)) {
      throw new WebhookValidationError(
        "99Food payload must include event_id, eventId, or id (or send x-external-event-id / x-idempotency-key)",
      );
    }
  }
}

async function resolveWebhookTenant(
  path: WebhookSourcePath,
  req: Request,
  body: unknown,
): Promise<WebhookTenantResolution> {
  if (path === "whatsapp") {
    const phoneNumberId = extractWhatsAppPhoneNumberId(body);
    if (phoneNumberId) {
      const account = await whatsappAccountRepository.findByPhoneNumberId(phoneNumberId);
      if (account) {
        return { tenantId: account.tenantId, resolvedBy: "phone_number_id" };
      }
    }
  }

  const tenant = await resolveTenantFromApiKey(req.header("x-api-key") ?? undefined);
  if (tenant) return { tenantId: tenant.id, resolvedBy: "api_key" };
  throw new WebhookValidationError("Could not resolve tenant");
}

async function maybeValidateWhatsAppSignature(
  req: Request,
  body: unknown,
): Promise<void> {
  const phoneNumberId = extractWhatsAppPhoneNumberId(body);
  if (!phoneNumberId) {
    logger.warn({ path: "whatsapp" }, "whatsapp_signature_skip_no_phone_number_id");
    return;
  }
  const account = await whatsappAccountRepository.findByPhoneNumberId(phoneNumberId);
  if (!account?.appSecret) {
    logger.info({ phoneNumberId }, "whatsapp_signature_skip_no_app_secret");
    return;
  }

  const header = req.get("x-hub-signature-256") ?? "";
  const payload = stableJsonStringify(body);
  const computed = `sha256=${createHmac("sha256", account.appSecret).update(payload).digest("hex")}`;

  let isValid = false;
  try {
    isValid =
      header.length === computed.length &&
      timingSafeEqual(Buffer.from(header, "utf8"), Buffer.from(computed, "utf8"));
  } catch {
    isValid = false;
  }

  logger.info({ phoneNumberId, isValid }, "whatsapp_signature_validated");
  if (env.WHATSAPP_REQUIRE_SIGNATURE && !isValid) {
    throw new WebhookValidationError("Invalid WhatsApp signature");
  }
}

function headerId(req: Request): string | null {
  const a = req.get("x-external-event-id");
  const b = req.get("x-idempotency-key");
  const v = (a ?? b)?.trim();
  if (!v || v.length > 512) return null;
  return v;
}

function resolveExternalEventId(
  path: WebhookSourcePath,
  source: Source,
  body: unknown,
  req: Request,
): string {
  const fromHeader = headerId(req);
  if (fromHeader) return fromHeader;

  const extracted = extractFromBody(path, body);
  if (extracted) return extracted;

  const hash = sha256Hex(`${source}:${stableJsonStringify(body)}`);
  return `hash:${hash}`;
}

function extractFromBody(path: WebhookSourcePath, body: unknown): string | null {
  const o = body as Record<string, unknown>;
  if (path === "whatsapp") {
    const id = digWhatsAppMessageId(o);
    if (id) return id;
  }
  if (path === "ifood") {
    for (const key of ["id", "orderId", "eventId"] as const) {
      const v = o[key];
      if (typeof v === "string" && v.length > 0) return v;
    }
    const ev = o.event as Record<string, unknown> | undefined;
    if (ev && typeof ev.id === "string" && ev.id.length > 0) return ev.id;
  }
  if (path === "99food") {
    for (const key of ["event_id", "eventId", "id"] as const) {
      const v = o[key];
      if (typeof v === "string" && v.length > 0) return v;
    }
  }
  return null;
}

function digWhatsAppMessageId(body: Record<string, unknown>): string | null {
  const entry = body.entry;
  if (!Array.isArray(entry) || entry.length === 0) return null;
  const first = entry[0] as Record<string, unknown>;
  const changes = first.changes;
  if (!Array.isArray(changes) || changes.length === 0) return null;
  const ch0 = changes[0] as Record<string, unknown>;
  const value = ch0.value as Record<string, unknown> | undefined;
  if (!value) return null;
  const messages = value.messages;
  if (!Array.isArray(messages) || messages.length === 0) return null;
  const m0 = messages[0] as Record<string, unknown>;
  const id = m0.id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

export class WebhookValidationError extends Error {
  readonly statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = "WebhookValidationError";
  }
}
