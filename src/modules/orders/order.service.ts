import { Prisma, Source, type OrderStatus } from "@prisma/client";
import { customerRepository } from "../customers/customer.repository.js";
import { orderRepository, type CreateOrderRow } from "./order.repository.js";
import { logger } from "../../lib/logger.js";
import { sendWhatsAppText } from "../whatsapp/outbound.service.js";
import { legacyIntegrationService } from "../legacy_integrations/legacy-integration.service.js";

export type CreateOrderItemInput = {
  name: string;
  quantity?: number;
  unitPrice?: string | number | null;
  metadata?: Prisma.InputJsonValue;
};

export type CreateOrderInput = {
  customerId?: string | null;
  source: unknown;
  externalOrderId: unknown;
  status?: CreateOrderRow["status"];
  rawPayload?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
  items: unknown;
};

export const orderService = {
  list(tenantId: string) {
    return orderRepository.listByTenant(tenantId);
  },

  listPendingConfirmation(tenantId: string) {
    return orderRepository.listPendingConfirmation(tenantId);
  },

  async confirm(tenantId: string, orderId: string, nextStatus?: OrderStatus) {
    return orderRepository.confirmOrder(tenantId, orderId, nextStatus ?? "ORDER_RECEIVED");
  },

  async transitionByAction(
    tenantId: string,
    orderId: string,
    action: "accept" | "reject" | "ready" | "delivering" | "delivered",
  ) {
    const transition = TRANSITIONS[action];
    if (!transition) throw new Error("ORDER_UNKNOWN_ACTION");

    const result = await transitionWithFallback(
      tenantId,
      orderId,
      transition.from,
      transition.to,
      { source: "operator_action", action },
    );

    if (!result.changed) {
      logger.info(
        { tenantId, orderId, status: result.order.status, action },
        "order_status_updated",
      );
      return result.order;
    }

    logger.info(
      {
        tenantId,
        orderId,
        action,
        previousStatus: result.previousStatus,
        status: result.order.status,
      },
      "order_status_updated",
    );

    const outboundMessage = transition.whatsappMessage;
    if (
      outboundMessage &&
      result.order.source === Source.WHATSAPP &&
      result.order.customer?.phone
    ) {
      await sendWhatsAppText({
        tenantId,
        phone: result.order.customer.phone,
        messageText: outboundMessage,
        context: {
          kind: "order_status_update",
          orderId: result.order.id,
          status: result.order.status,
          action,
        },
      });
      logger.info(
        { tenantId, orderId: result.order.id, status: result.order.status, action },
        "whatsapp_order_status_sent",
      );
    }

    if (result.changed && result.order.status === "ORDER_ACCEPTED") {
      try {
        await legacyIntegrationService.exportOrder(result.order.id, tenantId);
      } catch (err) {
        logger.error(
          { err, tenantId, orderId: result.order.id },
          "legacy_export_after_order_accept_failed",
        );
      }
    }

    return result.order;
  },

  async create(tenantId: string, input: CreateOrderInput) {
    if (typeof input.source !== "string") throw new Error("INVALID_SOURCE");
    const source = parseSource(input.source);
    if (!source) throw new Error("INVALID_SOURCE");

    const externalOrderId =
      typeof input.externalOrderId === "string" ? input.externalOrderId.trim() : "";
    if (!externalOrderId) throw new Error("MISSING_EXTERNAL_ORDER_ID");

    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new Error("ITEMS_REQUIRED");
    }

    const customerId =
      typeof input.customerId === "string" && input.customerId.length > 0
        ? input.customerId
        : null;

    if (customerId) {
      const customer = await customerRepository.findInTenant(tenantId, customerId);
      if (!customer) throw new Error("INVALID_CUSTOMER");
    }

    const items = input.items.map((raw) => {
      const it = raw as CreateOrderItemInput;
      const name = typeof it.name === "string" ? it.name.trim() : "";
      if (!name) throw new Error("ITEM_NAME_REQUIRED");
      const qty = typeof it.quantity === "number" && it.quantity > 0 ? it.quantity : 1;
      const unitPrice =
        it.unitPrice === null || it.unitPrice === undefined
          ? null
          : new Prisma.Decimal(it.unitPrice as string | number);
      return {
        name,
        quantity: qty,
        unitPrice,
        metadata: it.metadata ?? {},
      };
    });

    const row: CreateOrderRow = {
      customerId,
      source,
      externalOrderId,
      status: input.status,
      rawPayload: input.rawPayload ?? {},
      metadata: input.metadata ?? {},
      items,
    };

    return orderRepository.createWithItems(tenantId, row);
  },
};

const TRANSITIONS: Record<
  "accept" | "reject" | "ready" | "delivering" | "delivered",
  { from: OrderStatus | OrderStatus[]; to: OrderStatus; whatsappMessage?: string }
> = {
  accept: {
    from: "PENDING_CONFIRMATION",
    to: "ORDER_ACCEPTED",
    whatsappMessage: "Seu pedido foi aceito",
  },
  reject: {
    from: "PENDING_CONFIRMATION",
    to: "CANCELLED",
  },
  ready: {
    from: ["ORDER_RECEIVED", "ORDER_ACCEPTED"],
    to: "ORDER_READY",
    whatsappMessage: "Seu pedido está pronto",
  },
  delivering: {
    from: "ORDER_READY",
    to: "ORDER_DELIVERING",
    whatsappMessage: "Seu pedido saiu para entrega",
  },
  delivered: {
    from: "ORDER_DELIVERING",
    to: "ORDER_DELIVERED",
    whatsappMessage: "Pedido entregue",
  },
};

function parseSource(v: string): Source | null {
  return (Object.values(Source) as string[]).includes(v) ? (v as Source) : null;
}

async function transitionWithFallback(
  tenantId: string,
  orderId: string,
  expectedFrom: OrderStatus | OrderStatus[],
  nextStatus: OrderStatus,
  metadata: Prisma.InputJsonValue,
) {
  const allowed = Array.isArray(expectedFrom) ? expectedFrom : [expectedFrom];
  let lastError: unknown = null;
  for (const from of allowed) {
    try {
      return await orderRepository.transitionOrderStatus(
        tenantId,
        orderId,
        from,
        nextStatus,
        metadata,
      );
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : "";
      if (msg !== "ORDER_INVALID_TRANSITION") throw err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("ORDER_INVALID_TRANSITION");
}
