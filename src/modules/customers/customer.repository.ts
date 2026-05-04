import type { Customer, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export const customerRepository = {
  async listByTenant(tenantId: string): Promise<Customer[]> {
    return prisma.customer.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
  },

  async create(tenantId: string, data: Omit<Prisma.CustomerCreateInput, "tenant">): Promise<Customer> {
    return prisma.customer.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  },

  async findInTenant(tenantId: string, id: string): Promise<Customer | null> {
    return prisma.customer.findFirst({ where: { id, tenantId } });
  },

  async findByTenantAndPhone(tenantId: string, phone: string): Promise<Customer | null> {
    return prisma.customer.findFirst({ where: { tenantId, phone } });
  },

  /** Persists display name; tenant-scoped. */
  async setName(tenantId: string, customerId: string, name: string): Promise<Customer> {
    const row = await prisma.customer.findFirst({ where: { id: customerId, tenantId } });
    if (!row) throw new Error("CUSTOMER_NOT_FOUND");
    return prisma.customer.update({
      where: { id: customerId },
      data: { name },
    });
  },

  /** Merges patch into existing JSON metadata; tenant-scoped. */
  async mergeMetadata(tenantId: string, customerId: string, patch: Record<string, unknown>): Promise<Customer> {
    const row = await prisma.customer.findFirst({ where: { id: customerId, tenantId } });
    if (!row) throw new Error("CUSTOMER_NOT_FOUND");
    const base =
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {};
    const next = { ...base, ...patch };
    return prisma.customer.update({
      where: { id: customerId },
      data: { metadata: next as Prisma.InputJsonValue },
    });
  },

  async updateName(tenantId: string, id: string, name: string): Promise<Customer> {
    const existing = await prisma.customer.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error("CUSTOMER_NOT_FOUND");
    const meta = (existing.metadata && typeof existing.metadata === "object" ? existing.metadata : {}) as Record<
      string,
      unknown
    >;
    meta.whatsappOnboarding = "HAS_NAME";
    return prisma.customer.update({
      where: { id },
      data: { name, metadata: meta as Prisma.InputJsonValue },
    });
  },
};
