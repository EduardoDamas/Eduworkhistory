import { Source } from "@prisma/client";
import type { Request } from "express";
import { env } from "../../config/env.js";
import { stableJsonStringify, sha256Hex } from "../../lib/stable-json.js";
import { logger } from "../../lib/logger.js";
import { resolveTenantFromApiKey } from "../auth/middleware.js";
import { runWithTenant } from "../auth/tenant-context.js";
import { inboundEventService } from "../inbound_events/inbound-event.service.js";
import { whatsappAccountRepository } from "../whatsapp_accounts/whatsapp-account.repository.js";
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

    const externalEventId = resolveExternalEventId(path, source, body, req);
    const tenantResolution = await resolveWebhookTenant(path, req, body);

    const result = await runWithTenant(
      {
        id: tenantResolution.tenantId,
        name: `tenant:${tenantResolution.tenantId}`,
        apiKey: "resolved_via_webhook",
        resolvedBy: tenantResolution.resolvedBy,
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
    _verifyToken: string | undefined,
    challenge: string | undefined,
  ): Promise<string | null> {
    if (mode === "subscribe" && challenge) {
      logger.warn("whatsapp_meta_verify_deprecated_use_twilio_webhook");
    }
    return null;
  },

  async handleTwilioWhatsapp(req: Request): Promise<{ ok: true; accepted: true; inboundEventId?: string; duplicate?: boolean }> {
    const body = req.body;
    const payload = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
    const from = normalizeWhatsappAddress(asString(payload.From));
    const to = normalizeWhatsappAddress(asString(payload.To));
    const text = asString(payload.Body);
    const messageSid = asString(payload.MessageSid);
    const accountSid = asString(payload.AccountSid);

    logger.info(
      {
        provider: "twilio",
        channel: "whatsapp",
        from,
        to,
        textLength: text.length,
        accountSid,
        messageSid,
        twilioEnabled: env.TWILIO_ENABLED,
      },
      "twilio_whatsapp_inbound_received",
    );

    const tenantResolution = await resolveTwilioTenant(req, payload);
    const sourcePayload = {
      provider: "twilio",
      AccountSid: accountSid,
      MessageSid: messageSid,
      From: from,
      To: to,
      Body: text,
      raw: payload,
    };
    const externalEventId = messageSid || headerId(req) || `twilio:${sha256Hex(stableJsonStringify(sourcePayload))}`;
    const result = await runWithTenant(
      {
        id: tenantResolution.tenantId,
        name: `tenant:${tenantResolution.tenantId}`,
        apiKey: "resolved_via_twilio_webhook",
        resolvedBy: tenantResolution.resolvedBy,
      },
      () =>
        inboundEventService.ingest({
          tenantId: tenantResolution.tenantId,
          source: Source.WHATSAPP,
          payload: sourcePayload,
          externalEventId,
        }),
    );

    return {
      ok: true,
      accepted: true,
      inboundEventId: result.inboundEventId,
      duplicate: result.duplicate,
    };
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
  if (path === "whatsapp") return resolveTwilioTenant(req, body);
  const tenant = await resolveTenantFromApiKey(req.header("x-api-key") ?? undefined);
  if (tenant) return { tenantId: tenant.id, resolvedBy: "api_key" };
  throw new WebhookValidationError("Could not resolve tenant");
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
    const twilioSid = o.MessageSid;
    if (typeof twilioSid === "string" && twilioSid.length > 0) return twilioSid;
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

async function resolveTwilioTenant(
  req: Request,
  body: unknown,
): Promise<WebhookTenantResolution> {
  const payload = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const accountSid = asString(payload.AccountSid).trim();
  const to = normalizeWhatsappAddress(asString(payload.To));

  if (accountSid && to) {
    const account = await whatsappAccountRepository.findActiveByAccountSidAndWhatsappFrom(accountSid, to);
    if (account) return { tenantId: account.tenantId, resolvedBy: "twilio_account_sid" };
  }
  if (accountSid) {
    const account = await whatsappAccountRepository.findActiveByAccountSid(accountSid);
    if (account) return { tenantId: account.tenantId, resolvedBy: "twilio_account_sid" };
  }
  if (to) {
    const account = await whatsappAccountRepository.findActiveByWhatsappFrom(to);
    if (account) return { tenantId: account.tenantId, resolvedBy: "twilio_whatsapp_from" };
  }

  const tenant = await resolveTenantFromApiKey(req.header("x-api-key") ?? undefined);
  if (tenant) return { tenantId: tenant.id, resolvedBy: "api_key" };
  throw new WebhookValidationError("Could not resolve tenant");
}

function normalizeWhatsappAddress(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  return raw.toLowerCase().startsWith("whatsapp:") ? raw.toLowerCase() : `whatsapp:${raw.toLowerCase()}`;
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
