import { prisma } from "../../lib/prisma.js";
import type { LegacyOrderExportContract, LegacyExternalSource } from "./legacy.types.js";

export const legacyOrderMapper = {
  async mapOrder(orderId: string, tenantId: string): Promise<LegacyOrderExportContract> {
    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: { customer: true, items: true },
    });
    if (!order) throw new Error("ORDER_NOT_FOUND");

    const displayCodes = order.items
      .map((item) => {
        const md = item.metadata as Record<string, unknown> | null;
        return typeof md?.displayCode === "string" ? md.displayCode : null;
      })
      .filter((v): v is string => Boolean(v));

    const products = displayCodes.length
      ? await prisma.product.findMany({
          where: { tenantId, displayCode: { in: displayCodes } },
        })
      : [];
    const productByCode = new Map(products.map((p) => [p.displayCode, p]));

    const orderMetadata = (order.metadata as Record<string, unknown> | null) ?? {};
    const customerAddress =
      typeof orderMetadata.address === "string" ? orderMetadata.address : null;

    return {
      orderId: order.id,
      externalOrderId: order.externalOrderId,
      tenantId,
      source: order.source,
      status: order.status,
      customer: {
        id: order.customer?.id ?? null,
        name: order.customer?.name ?? null,
        phone: order.customer?.phone ?? null,
        address: customerAddress,
      },
      items: order.items.map((item) => {
        const md = item.metadata as Record<string, unknown> | null;
        const displayCode = typeof md?.displayCode === "string" ? md.displayCode : null;
        const product = displayCode ? productByCode.get(displayCode) : undefined;
        return {
          productId: product?.id ?? null,
          externalId: product?.externalId ?? null,
          externalSource: (product?.externalSource ?? "UNKNOWN") as LegacyExternalSource,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice ? Number(item.unitPrice.toString()) : null,
        };
      }),
      total: Number(order.total.toString()),
      createdAt: order.createdAt.toISOString(),
      metadata: orderMetadata,
    };
  },
};
