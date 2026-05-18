import type { Prisma } from "@prisma/client";
import { logger } from "../../lib/logger.js";

export type WhatsAppInboundExtract = {
  phone: string;
  text: string;
  messageRaw: unknown;
};

/**
 * Reads `messages[].text.body` when `text` is an object (Cloud API may omit `type` on some payloads).
 */
function extractTextBodyFromMessage(m: Record<string, unknown>): string {
  const textField = m.text;
  if (textField && typeof textField === "object" && !Array.isArray(textField)) {
    const body = (textField as Record<string, unknown>).body;
    if (typeof body === "string") return body.trim();
  }
  return "";
}

/**
 * Extract Cloud API webhook inbound text + phone from stored JSON payload.
 *
 * **Phone:** `entry[].changes[].value.messages[].from`
 *
 * **Text:** `entry[].changes[].value.messages[].text.body` (trimmed). Read for every inbound
 * message that has a `from` field, whether or not `type: "text"` is set (test payloads often omit `type`).
 * If `text` / `body` is missing, returns `text: ""`.
 */
export function extractWhatsAppInboundMessage(payload: unknown): WhatsAppInboundExtract | null {
  if (payload === null || typeof payload !== "object") return null;

  const root = payload as Record<string, unknown>;
  const twilioFrom = root.From;
  const twilioBody = root.Body;
  const twilioSid = root.MessageSid;
  if (typeof twilioFrom === "string" && twilioFrom.trim()) {
    const phone = twilioFrom.trim();
    const text = typeof twilioBody === "string" ? twilioBody.trim() : "";
    logger.info(
      {
        phone,
        textLength: text.length,
        messageType: "twilio_whatsapp",
      },
      "whatsapp_payload_extracted",
    );
    return {
      phone,
      text,
      messageRaw: {
        provider: "twilio",
        from: phone,
        body: text,
        messageSid: typeof twilioSid === "string" ? twilioSid : null,
      },
    };
  }

  const entry = root.entry;
  if (!Array.isArray(entry) || entry.length === 0) return null;

  for (const ent of entry) {
    if (!ent || typeof ent !== "object") continue;
    const changes = (ent as Record<string, unknown>).changes;
    if (!Array.isArray(changes)) continue;

    for (const ch of changes) {
      if (!ch || typeof ch !== "object") continue;
      const value = (ch as Record<string, unknown>).value as Record<string, unknown> | undefined;
      if (!value) continue;

      const messages = value.messages;
      if (!Array.isArray(messages) || messages.length === 0) continue;

      for (const msg of messages) {
        if (!msg || typeof msg !== "object") continue;
        const m = msg as Record<string, unknown>;
        const from = m.from;
        if (typeof from !== "string" || !from.trim()) continue;

        const phone = from.trim();
        const text = extractTextBodyFromMessage(m);
        const type = m.type;

        logger.info(
          {
            phone,
            textLength: text.length,
            messageType: type === undefined || type === null ? "unspecified" : String(type),
          },
          "whatsapp_payload_extracted",
        );

        return {
          phone,
          text,
          messageRaw: msg as Prisma.InputJsonValue,
        };
      }
    }
  }

  return null;
}

export function normalizeWhatsappPhone(from: string): string {
  return from.replace(/\D/g, "");
}

export function extractWhatsAppPhoneNumberId(payload: unknown): string | null {
  if (payload === null || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const entry = root.entry;
  if (!Array.isArray(entry)) return null;
  for (const ent of entry) {
    if (!ent || typeof ent !== "object") continue;
    const changes = (ent as Record<string, unknown>).changes;
    if (!Array.isArray(changes)) continue;
    for (const ch of changes) {
      if (!ch || typeof ch !== "object") continue;
      const value = (ch as Record<string, unknown>).value as Record<string, unknown> | undefined;
      const metadata = value?.metadata as Record<string, unknown> | undefined;
      const id = metadata?.phone_number_id;
      if (typeof id === "string" && id.trim()) return id.trim();
    }
  }
  return null;
}
