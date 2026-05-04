import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export const productRepository = {
  async listByTenant(tenantId: string) {
    return prisma.product.findMany({
      where: { tenantId },
      orderBy: { displayCode: "asc" },
    });
  },

  async findById(tenantId: string, productId: string) {
    return prisma.product.findFirst({
      where: { tenantId, id: productId },
    });
  },

  async listActiveByTenant(tenantId: string) {
    return prisma.product.findMany({
      where: { tenantId, active: true },
      orderBy: { displayCode: "asc" },
    });
  },

  async findByDisplayCodes(tenantId: string, displayCodes: string[]) {
    if (displayCodes.length === 0) return [];
    return prisma.product.findMany({
      where: { tenantId, active: true, displayCode: { in: displayCodes } },
    });
  },

  async seedDemoCatalogIfEmpty(tenantId: string): Promise<void> {
    const count = await prisma.product.count({ where: { tenantId } });
    if (count > 0) return;

    await prisma.product.createMany({
      data: [
        {
          tenantId,
          displayCode: "01",
          name: "Pizza mussarela",
          price: new Prisma.Decimal("55.80"),
        },
        {
          tenantId,
          displayCode: "02",
          name: "Pizza calabresa",
          price: new Prisma.Decimal("58.80"),
        },
        {
          tenantId,
          displayCode: "03",
          name: "Pizza 4 queijos",
          price: new Prisma.Decimal("65.80"),
        },
      ],
    });
  },

  async updateMapping(
    tenantId: string,
    productId: string,
    data: {
      externalId?: string | null;
      externalSource?: "FIREBIRD" | "MSSQL" | "MANUAL" | "UNKNOWN";
      syncMetadata?: Prisma.InputJsonValue | null;
    },
  ) {
    const row = await prisma.product.findFirst({ where: { tenantId, id: productId } });
    if (!row) throw new Error("PRODUCT_NOT_FOUND");
    return prisma.product.update({
      where: { id: productId },
      data: {
        externalId: data.externalId,
        externalSource: data.externalSource,
        syncMetadata:
          data.syncMetadata === null
            ? Prisma.DbNull
            : data.syncMetadata,
        lastSyncedAt: new Date(),
      },
    });
  },
};
