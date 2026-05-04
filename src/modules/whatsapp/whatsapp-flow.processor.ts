import type { Prisma } from "@prisma/client";
import { Source } from "@prisma/client";
import { logger } from "../../lib/logger.js";
import { prisma } from "../../lib/prisma.js";
import { customerRepository } from "../customers/customer.repository.js";
import { orderRepository } from "../orders/order.repository.js";
import { productRepository } from "../catalog/product.repository.js";
import { parseProductDisplayCodes } from "./catalog-parser.js";
import {
  extractWhatsAppInboundMessage,
  normalizeWhatsappPhone,
} from "./whatsapp-payload.js";
import { whatsappConversationRepository } from "./whatsapp-conversation.repository.js";
import { whatsappMessageRepository } from "./whatsapp-message.repository.js";
import { sendWhatsAppText } from "./outbound.service.js";

const MSG_GREET_NEEDS_NAME =
  "Olá! Para iniciar seu pedido, informe seu nome completo.";
const MSG_ASK_ADDRESS_LONG = "Obrigado! Agora informe seu endereço completo para entrega.";
const MSG_NOW_ADDRESS = "Agora envie seu endereço.";
const MSG_ORDER_RECEIVED =
  "Seu pedido foi recebido e está aguardando confirmação do operador.";
const MSG_WAIT_OPERATOR = "Seu pedido está aguardando confirmação do operador.";
const MSG_INVALID_ITEMS =
  "Não consegui entender os códigos dos itens. Use números como 1, 2 ou 01 02 separados por espaço ou vírgula.";
const MSG_INVALID_ADDRESS = "Por favor, envie seu endereço completo.";

function isPrismaUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2002";
}

/** Rejects short greetings (e.g. "Oi", "Ok") unless it looks like a name (2+ words or length ≥ 5). */
function isValidName(name: string): boolean {
  if (!name) return false;
  const parts = name.split(" ").filter(Boolean);
  return parts.length >= 2 || name.length >= 5;
}

export async function processWhatsAppInbound(params: {
  tenantId: string;
  inboundEventId: string;
  payload: unknown;
}): Promise<void> {
  const { tenantId, inboundEventId, payload } = params;

  const extracted = extractWhatsAppInboundMessage(payload);
  if (!extracted) {
    logger.warn({ tenantId, inboundEventId }, "whatsapp_skip_no_inbound_message");
    return;
  }

  const phoneKey = normalizeWhatsappPhone(extracted.phone);
  if (!phoneKey) {
    logger.warn({ tenantId, inboundEventId }, "whatsapp_skip_empty_phone");
    return;
  }

  const messageText = extracted.text.trim();
  const inboundRaw: Prisma.InputJsonValue =
    (extracted.messageRaw as Prisma.InputJsonValue) ?? ({} as Prisma.InputJsonValue);

  await whatsappMessageRepository.create(tenantId, {
    phone: phoneKey,
    direction: "INBOUND",
    messageText,
    rawPayload: inboundRaw,
  });
  logger.info({ tenantId, phone: phoneKey, inboundEventId }, "whatsapp_inbound_message_logged");

  await productRepository.seedDemoCatalogIfEmpty(tenantId);

  let customer = await customerRepository.findByTenantAndPhone(tenantId, phoneKey);

  if (!customer) {
    try {
      customer = await customerRepository.create(tenantId, {
        phone: phoneKey,
        name: null,
        metadata: { whatsappOnboarding: "NEEDS_NAME" },
      });
    } catch (e) {
      if (isPrismaUniqueViolation(e)) {
        customer = await customerRepository.findByTenantAndPhone(tenantId, phoneKey);
        if (!customer) throw e;
        logger.info({ tenantId, phone: phoneKey, inboundEventId }, "whatsapp_customer_unique_race_recovered");
      } else {
        throw e;
      }
    }
  }

  let conv = await whatsappConversationRepository.findByTenantPhone(tenantId, phoneKey);
  if (!conv) {
    const initialState = customer.name?.trim() ? "NEEDS_ADDRESS" : "NEEDS_NAME";
    try {
      conv = await whatsappConversationRepository.create({
        tenantId,
        phone: phoneKey,
        customerId: customer.id,
        state: initialState,
      });
    } catch (e) {
      if (isPrismaUniqueViolation(e)) {
        conv = await whatsappConversationRepository.findByTenantPhone(tenantId, phoneKey);
        if (!conv) throw e;
        logger.info({ tenantId, phone: phoneKey, inboundEventId }, "whatsapp_conversation_unique_race_recovered");
      } else {
        throw e;
      }
    }
  }

  customer = (await customerRepository.findByTenantAndPhone(tenantId, phoneKey))!;
  conv = (await whatsappConversationRepository.findByTenantPhone(tenantId, phoneKey))!;

  if (conv.state === "PENDING_CONFIRMATION") {
    await logOutbound(tenantId, phoneKey, MSG_WAIT_OPERATOR, { inboundEventId, phase: "pending_confirmation" });
    return;
  }

  if (conv.state === "NEEDS_NAME") {
    const trimmedName = messageText.trim();
    if (trimmedName.length === 0) {
      await logOutbound(tenantId, phoneKey, MSG_GREET_NEEDS_NAME, { inboundEventId, phase: "prompt_name" });
      return;
    }

    if (!isValidName(trimmedName)) {
      logger.info(
        {
          tenantId,
          customerId: customer.id,
          convId: conv.id,
          trimmedName,
          inboundEventId,
        },
        "whatsapp_name_rejected",
      );
      await logOutbound(tenantId, phoneKey, MSG_GREET_NEEDS_NAME, { inboundEventId, phase: "name_rejected" });
      return;
    }

    logger.info(
      {
        tenantId,
        customerId: customer.id,
        convId: conv.id,
        messageText: trimmedName,
        inboundEventId,
      },
      "whatsapp_name_detected",
    );

    const freshConv = await prisma.whatsAppConversation.findUnique({
      where: { id: conv.id },
    });
    if (!freshConv || freshConv.state !== "NEEDS_NAME") {
      logger.info(
        {
          tenantId,
          customerId: customer.id,
          convId: conv.id,
          currentState: freshConv?.state ?? null,
          inboundEventId,
        },
        "whatsapp_name_skipped_due_to_state",
      );
      return;
    }

    await prisma.customer.update({
      where: { id: customer.id },
      data: { name: trimmedName },
    });
    logger.info(
      { tenantId, customerId: customer.id, phone: phoneKey, inboundEventId, name: trimmedName },
      "whatsapp_name_saved",
    );

    await prisma.whatsAppConversation.update({
      where: { id: conv.id },
      data: { state: "NEEDS_ADDRESS" },
    });
    logger.info(
      {
        tenantId,
        convId: conv.id,
        fromState: "NEEDS_NAME",
        toState: "NEEDS_ADDRESS",
        inboundEventId,
      },
      "whatsapp_state_updated",
    );

    await logOutbound(tenantId, phoneKey, MSG_NOW_ADDRESS, { inboundEventId, phase: "needs_address" });
    return;
  }

  if (conv.state === "NEEDS_ADDRESS") {
    if (!messageText || messageText.length < 5) {
      const prompt = messageText.length === 0 ? MSG_ASK_ADDRESS_LONG : MSG_INVALID_ADDRESS;
      await logOutbound(tenantId, phoneKey, prompt, { inboundEventId });
      return;
    }

    await customerRepository.mergeMetadata(tenantId, customer.id, { address: messageText });
    logger.info(
      { tenantId, customerId: customer.id, phone: phoneKey, inboundEventId },
      "whatsapp_address_saved",
    );

    await whatsappConversationRepository.updateById(tenantId, conv.id, {
      state: "READY_TO_ORDER",
      address: messageText,
    });
    logger.info(
      {
        tenantId,
        convId: conv.id,
        fromState: "NEEDS_ADDRESS",
        toState: "READY_TO_ORDER",
        inboundEventId,
      },
      "whatsapp_state_updated",
    );

    conv = (await whatsappConversationRepository.findByTenantPhone(tenantId, phoneKey))!;

    const products = await productRepository.listActiveByTenant(tenantId);
    const menu = buildMenuText(products);
    await logOutbound(tenantId, phoneKey, menu, { inboundEventId, phase: "menu" });
    return;
  }

  if (conv.state === "READY_TO_ORDER" || conv.state === "WAITING_ORDER_ITEMS") {
    if (!messageText) {
      await logOutbound(tenantId, phoneKey, MSG_INVALID_ITEMS, { inboundEventId });
      return;
    }

    const { codes, invalidTokens } = parseProductDisplayCodes(messageText);
    if (invalidTokens.length > 0) {
      await logOutbound(tenantId, phoneKey, MSG_INVALID_ITEMS, { inboundEventId, invalidTokens });
      return;
    }
    if (codes.length === 0) {
      await logOutbound(tenantId, phoneKey, MSG_INVALID_ITEMS, { inboundEventId });
      return;
    }

    const qtyByCode = new Map<string, number>();
    for (const c of codes) qtyByCode.set(c, (qtyByCode.get(c) ?? 0) + 1);
    const uniqueCodes: string[] = [];
    for (const c of codes) {
      if (!uniqueCodes.includes(c)) uniqueCodes.push(c);
    }

    const products = await productRepository.findByDisplayCodes(tenantId, uniqueCodes);
    const byCode = new Map(products.map((p) => [p.displayCode, p]));
    const missing = uniqueCodes.filter((c) => !byCode.has(c));
    if (missing.length > 0) {
      await logOutbound(tenantId, phoneKey, `${MSG_INVALID_ITEMS} (códigos: ${missing.join(", ")})`, {
        inboundEventId,
        missing,
      });
      return;
    }

    const items = uniqueCodes.map((code) => {
      const p = byCode.get(code)!;
      const quantity = qtyByCode.get(code) ?? 1;
      return {
        name: p.name,
        quantity,
        unitPrice: p.price,
        metadata: { displayCode: p.displayCode } as Prisma.InputJsonValue,
      };
    });

    const externalOrderId = buildWhatsappExternalOrderId(phoneKey);
    customer = (await customerRepository.findByTenantAndPhone(tenantId, phoneKey))!;
    const convRow =
      (await whatsappConversationRepository.findByTenantPhone(tenantId, phoneKey)) ?? conv;
    const meta = customer.metadata as Record<string, unknown> | null;
    const addressFromMeta =
      meta && typeof meta.address === "string" ? (meta.address as string) : convRow.address;
    const total = items.reduce((acc, it) => acc + Number(it.unitPrice ?? 0) * it.quantity, 0);

    const rawPayload: Prisma.InputJsonValue = {
      channel: "whatsapp",
      inboundEventId,
      messageText,
      selectedCodes: uniqueCodes,
      quantities: Object.fromEntries(qtyByCode),
      customerPhone: phoneKey,
    };

    await orderRepository.createWithItems(tenantId, {
      customerId: customer.id,
      source: Source.WHATSAPP,
      externalOrderId,
      status: "PENDING_CONFIRMATION",
      rawPayload,
      metadata: {
        address: addressFromMeta ?? null,
        total,
      },
      items,
    });

    await whatsappConversationRepository.updateById(tenantId, conv.id, { state: "PENDING_CONFIRMATION" });
    logger.info(
      {
        tenantId,
        convId: conv.id,
        fromState: conv.state,
        toState: "PENDING_CONFIRMATION",
        inboundEventId,
      },
      "whatsapp_state_updated",
    );

    await logOutbound(tenantId, phoneKey, MSG_ORDER_RECEIVED, { inboundEventId, phase: "order_created" });
    logger.info(
      { tenantId, phone: phoneKey, inboundEventId, externalOrderId, total },
      "whatsapp_order_created",
    );
    return;
  }

  logger.warn({ tenantId, phone: phoneKey, state: conv.state }, "whatsapp_unhandled_state");
}

function buildWhatsappExternalOrderId(phoneDigits: string): string {
  const safe = phoneDigits.replace(/[^\d]/g, "").slice(0, 24);
  return `whatsapp_${safe}_${Date.now()}`;
}

function buildMenuText(
  products: { displayCode: string; name: string; price: { toString(): string } }[],
): string {
  const lines = products.map(
    (p) => `${p.displayCode} - ${p.name} - R$ ${Number(p.price.toString()).toFixed(2).replace(".", ",")}`,
  );
  return [
    "Cardápio — envie os códigos dos itens (ex.: 1,2 ou 01 02):",
    ...lines,
  ].join("\n");
}

async function logOutbound(
  tenantId: string,
  phone: string,
  messageText: string,
  raw: Record<string, unknown>,
): Promise<void> {
  await sendWhatsAppText({
    tenantId,
    phone,
    messageText,
    context: raw,
  });
  logger.info(
    { tenantId, phone, messagePreview: messageText.slice(0, 80) },
    "whatsapp_outbound_message_logged",
  );
}
