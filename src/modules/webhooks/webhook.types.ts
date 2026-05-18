import type { Source } from "@prisma/client";

export type WebhookSourcePath = "whatsapp" | "ifood" | "99food";

export type IngestWebhookResult = {
  ok: true;
  inboundEventId: string;
  duplicate: boolean;
  /** API-level outcome: new job accepted (`QUEUED`) vs idempotent replay (`DUPLICATE`). */
  state: "QUEUED" | "DUPLICATE";
};

export type WebhookTenantResolution = {
  tenantId: string;
  resolvedBy: "api_key" | "phone_number_id" | "twilio_account_sid" | "twilio_whatsapp_from";
};

/** Minimal normalized shape (no channel-specific parsing in Phase 2). */
export type NormalizedInboundPayload = {
  source: Source;
  externalId: string;
  customer: null;
  items: unknown[];
  raw: unknown;
};
