import type { Prisma } from "@prisma/client";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { whatsappMessageRepository } from "./whatsapp-message.repository.js";
import { whatsappAccountRepository } from "../whatsapp_accounts/whatsapp-account.repository.js";

export type WhatsAppSendResult = {
  simulatedOutbound: boolean;
  provider: "twilio";
  providerMessageId?: string;
  providerStatusCode?: number;
  providerError?: {
    provider: "twilio";
    statusCode?: number;
    errorMessage?: string;
    raw?: unknown;
  };
};

export async function sendWhatsAppText(input: {
  tenantId: string;
  accountId?: string;
  accountSid?: string;
  authToken?: string;
  whatsappFrom?: string;
  phone: string;
  messageText: string;
  context: Record<string, unknown>;
}): Promise<WhatsAppSendResult> {
  const creds = await resolveTwilioCredentials(input);
  const mode = creds ? "live" : "mock";

  const basePayload: Prisma.InputJsonValue = {
    ...input.context,
    channel: "whatsapp",
    provider: "twilio",
    sendMode: mode,
  };

  const row = await whatsappMessageRepository.create(input.tenantId, {
    phone: input.phone,
    direction: "OUTBOUND",
    messageText: input.messageText,
    rawPayload:
      mode === "mock"
        ? { ...(basePayload as object), simulatedOutbound: true, provider: "twilio" }
        : basePayload,
  });

  if (mode === "mock") {
    logger.info(
      {
        tenantId: input.tenantId,
        phone: input.phone,
        messageLength: input.messageText.length,
      },
      "whatsapp_outbound_mock_logged",
    );
    return { simulatedOutbound: true, provider: "twilio" };
  }
  const liveCreds = creds;
  if (!liveCreds) {
    return { simulatedOutbound: true, provider: "twilio" };
  }

  try {
    const sent = await sendViaTwilio({
      accountSid: liveCreds.accountSid,
      authToken: liveCreds.authToken,
      from: liveCreds.whatsappFrom,
      to: input.phone,
      messageText: input.messageText,
    });

    await whatsappMessageRepository.updateRawPayload(input.tenantId, row.id, {
      ...(basePayload as object),
      simulatedOutbound: false,
      provider: "twilio",
      providerMessageId: sent.providerMessageId ?? null,
      providerStatusCode: sent.providerStatusCode,
      from: liveCreds.whatsappFrom,
      accountSid: liveCreds.accountSid,
      credentialsSource: liveCreds.source,
      providerResponse: toJsonValue(sent.responseRaw),
    });
    logger.info(
      {
        tenantId: input.tenantId,
        phone: input.phone,
        messageLength: input.messageText.length,
      },
      "whatsapp_outbound_cloud_sent",
    );
    return {
      simulatedOutbound: false,
      provider: "twilio",
      providerMessageId: sent.providerMessageId,
      providerStatusCode: sent.providerStatusCode,
    };
  } catch (err) {
    const providerError = {
      provider: "twilio" as const,
      statusCode:
        err instanceof Error && "statusCode" in err && typeof err.statusCode === "number"
          ? err.statusCode
          : undefined,
      errorMessage: err instanceof Error ? err.message : String(err),
      raw: err instanceof Error && "raw" in err ? (err as { raw?: unknown }).raw : undefined,
    };

    const payload = {
      ...(basePayload as object),
      simulatedOutbound: false,
      provider: "twilio",
      providerStatusCode: providerError.statusCode ?? null,
      providerError: toJsonValue(providerError),
    };

    await whatsappMessageRepository.updateRawPayload(input.tenantId, row.id, payload as Prisma.InputJsonValue);
    logger.error(
      {
        err,
        tenantId: input.tenantId,
        phone: input.phone,
        messageLength: input.messageText.length,
      },
      "whatsapp_cloud_send_failed",
    );
    return {
      simulatedOutbound: false,
      provider: "twilio",
      providerStatusCode: providerError.statusCode,
      providerError,
    };
  }
}

type TwilioCredentials = {
  accountSid: string;
  authToken: string;
  whatsappFrom: string;
  source: "tenant" | "env_fallback";
};

async function resolveTwilioCredentials(input: {
  tenantId: string;
  accountId?: string;
  accountSid?: string;
  authToken?: string;
  whatsappFrom?: string;
}): Promise<TwilioCredentials | null> {
  if (input.accountSid?.trim() && input.authToken?.trim() && input.whatsappFrom?.trim()) {
    return {
      accountSid: input.accountSid.trim(),
      authToken: input.authToken.trim(),
      whatsappFrom: normalizeWhatsappAddress(input.whatsappFrom),
      source: "tenant",
    };
  }

  const account = input.accountId
    ? await whatsappAccountRepository.findByIdInTenant(input.tenantId, input.accountId)
    : await whatsappAccountRepository.findActiveByTenant(input.tenantId);
  if (account?.isActive && account.accountSid.trim() && account.authToken.trim() && account.whatsappFrom.trim()) {
    return {
      accountSid: account.accountSid.trim(),
      authToken: account.authToken.trim(),
      whatsappFrom: normalizeWhatsappAddress(account.whatsappFrom),
      source: "tenant",
    };
  }

  if (
    env.TWILIO_ACCOUNT_SID.trim() &&
    env.TWILIO_AUTH_TOKEN.trim() &&
    env.TWILIO_WHATSAPP_FROM.trim()
  ) {
    return {
      accountSid: env.TWILIO_ACCOUNT_SID.trim(),
      authToken: env.TWILIO_AUTH_TOKEN.trim(),
      whatsappFrom: normalizeWhatsappAddress(env.TWILIO_WHATSAPP_FROM),
      source: "env_fallback",
    };
  }

  return null;
}

async function sendViaTwilio(input: {
  accountSid: string;
  authToken: string;
  from: string;
  to: string;
  messageText: string;
}): Promise<{ responseRaw: unknown; providerMessageId?: string; providerStatusCode: number }> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(input.accountSid)}/Messages.json`;
  const body = new URLSearchParams({
    From: normalizeWhatsappAddress(input.from),
    To: normalizeWhatsappAddress(input.to),
    Body: input.messageText,
  });
  const basicAuth = Buffer.from(`${input.accountSid}:${input.authToken}`).toString("base64");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Basic ${basicAuth}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const text = await response.text();
  let raw: unknown = text;
  try {
    raw = text ? (JSON.parse(text) as unknown) : {};
  } catch {
    raw = text;
  }
  if (!response.ok) {
    const errorMessage =
      raw && typeof raw === "object" && "message" in raw && typeof raw.message === "string"
        ? raw.message
        : `Twilio API failed with status ${response.status}`;
    const error = new Error(errorMessage) as Error & { statusCode?: number; raw?: unknown };
    error.statusCode = response.status;
    error.raw = raw;
    throw error;
  }

  const providerMessageId =
    raw && typeof raw === "object" && "sid" in raw && typeof raw.sid === "string"
      ? raw.sid
      : undefined;
  return {
    responseRaw: raw,
    providerMessageId,
    providerStatusCode: response.status,
  };
}

function normalizeWhatsappAddress(value: string): string {
  const v = value.trim();
  return v.toLowerCase().startsWith("whatsapp:") ? `whatsapp:${v.slice(9)}` : `whatsapp:${v}`;
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (value === null) return "null";
  if (Array.isArray(value)) {
    return value.map((item) => toJsonValue(item));
  }
  if (typeof value === "object") {
    const out: Record<string, Prisma.InputJsonValue> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = toJsonValue(v);
    }
    return out;
  }
  return String(value);
}
