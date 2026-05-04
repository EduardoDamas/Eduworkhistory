import { env } from "../../../config/env.js";
import { logger } from "../../../lib/logger.js";

export class WhatsAppCloudError extends Error {
  readonly provider = "meta";
  readonly statusCode?: number;
  readonly errorCode?: number;
  readonly errorMessage?: string;
  readonly raw?: unknown;

  constructor(input: {
    message: string;
    statusCode?: number;
    errorCode?: number;
    errorMessage?: string;
    raw?: unknown;
  }) {
    super(input.message);
    this.name = "WhatsAppCloudError";
    this.statusCode = input.statusCode;
    this.errorCode = input.errorCode;
    this.errorMessage = input.errorMessage;
    this.raw = input.raw;
  }
}

export const whatsappCloudClient = {
  async sendText(input: {
    phoneNumberId: string;
    accessToken: string;
    to: string;
    messageText: string;
  }): Promise<{ raw: unknown; providerMessageId?: string; statusCode: number }> {
    const url = `https://graph.facebook.com/${env.WHATSAPP_GRAPH_API_VERSION}/${encodeURIComponent(
      input.phoneNumberId,
    )}/messages`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${input.accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: input.to,
        type: "text",
        text: { body: input.messageText },
      }),
    });

    const text = await response.text();
    let body: unknown = text;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = text;
    }

    if (!response.ok) {
      const metaError = pickMetaError(body);
      logger.error(
        {
          statusCode: response.status,
          phoneNumberId: input.phoneNumberId,
          to: input.to,
          providerBody: body,
        },
        "whatsapp_cloud_request_failed",
      );
      throw new WhatsAppCloudError({
        message: `WhatsApp Cloud API failed with status ${response.status}`,
        statusCode: response.status,
        errorCode: metaError.errorCode,
        errorMessage: metaError.errorMessage,
        raw: body,
      });
    }

    return {
      raw: body,
      providerMessageId: extractProviderMessageId(body),
      statusCode: response.status,
    };
  },
};

function pickMetaError(body: unknown): { errorCode?: number; errorMessage?: string } {
  if (!body || typeof body !== "object") return {};
  const root = body as Record<string, unknown>;
  const err = root.error;
  if (!err || typeof err !== "object") return {};
  const e = err as Record<string, unknown>;
  return {
    errorCode: typeof e.code === "number" ? e.code : undefined,
    errorMessage: typeof e.message === "string" ? e.message : undefined,
  };
}

function extractProviderMessageId(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const root = body as Record<string, unknown>;
  const messages = root.messages;
  if (!Array.isArray(messages) || messages.length === 0) return undefined;
  const first = messages[0];
  if (!first || typeof first !== "object") return undefined;
  const id = (first as Record<string, unknown>).id;
  return typeof id === "string" && id.trim() ? id.trim() : undefined;
}
