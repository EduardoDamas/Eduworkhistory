import type { Prisma, Tenant } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export const tenantRepository = {
  async create(data: Prisma.TenantCreateInput): Promise<Tenant> {
    return prisma.tenant.create({ data });
  },

  async findById(id: string): Promise<Tenant | null> {
    return prisma.tenant.findUnique({ where: { id } });
  },
};
