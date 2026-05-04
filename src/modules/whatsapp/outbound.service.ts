import type { Prisma } from "@prisma/client";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { whatsappMessageRepository } from "./whatsapp-message.repository.js";
import { whatsappCloudService, WhatsAppCloudError } from "./cloud-api/whatsapp-cloud.service.js";

export type WhatsAppSendResult = {
  simulatedOutbound: boolean;
  provider: "meta";
  providerMessageId?: string;
  providerStatusCode?: number;
  providerError?: {
    provider: "meta";
    statusCode?: number;
    errorCode?: number;
    errorMessage?: string;
    raw?: unknown;
  };
};

export async function sendWhatsAppText(input: {
  tenantId: string;
  accountId?: string;
  phone: string;
  messageText: string;
  context: Record<string, unknown>;
}): Promise<WhatsAppSendResult> {
  const mode = env.WHATSAPP_SEND_MODE === "cloud" ? "cloud" : "mock";

  const basePayload: Prisma.InputJsonValue = {
    ...input.context,
    channel: "whatsapp",
    provider: "meta",
    sendMode: mode,
  };

  const row = await whatsappMessageRepository.create(input.tenantId, {
    phone: input.phone,
    direction: "OUTBOUND",
    messageText: input.messageText,
    rawPayload:
      mode === "mock"
        ? { ...(basePayload as object), simulatedOutbound: true, provider: "meta" }
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
    return { simulatedOutbound: true, provider: "meta" };
  }

  try {
    const sent = input.accountId
      ? await whatsappCloudService.sendTextForAccount({
          tenantId: input.tenantId,
          accountId: input.accountId,
          to: input.phone,
          messageText: input.messageText,
        })
      : await whatsappCloudService.sendTextForTenant({
          tenantId: input.tenantId,
          to: input.phone,
          messageText: input.messageText,
        });

    await whatsappMessageRepository.updateRawPayload(input.tenantId, row.id, {
      ...(basePayload as object),
      simulatedOutbound: false,
      provider: "meta",
      providerMessageId: sent.providerMessageId ?? null,
      providerStatusCode: sent.providerStatusCode,
      phoneNumberId: sent.phoneNumberId,
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
      provider: "meta",
      providerMessageId: sent.providerMessageId,
      providerStatusCode: sent.providerStatusCode,
    };
  } catch (err) {
    const providerError =
      err instanceof WhatsAppCloudError
        ? {
            provider: "meta" as const,
            statusCode: err.statusCode,
            errorCode: err.errorCode,
            errorMessage: err.errorMessage ?? err.message,
            raw: err.raw,
          }
        : {
            provider: "meta" as const,
            errorMessage: err instanceof Error ? err.message : String(err),
          };

    const payload = {
      ...(basePayload as object),
      simulatedOutbound: false,
      provider: "meta",
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
      provider: "meta",
      providerStatusCode: providerError.statusCode,
      providerError,
    };
  }
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
