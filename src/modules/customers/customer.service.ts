import type { Prisma } from "@prisma/client";
import { customerRepository } from "./customer.repository.js";

export const customerService = {
  list(tenantId: string) {
    return customerRepository.listByTenant(tenantId);
  },

  create(
    tenantId: string,
    input: { phone: string; name?: string | null; metadata?: Prisma.InputJsonValue },
  ) {
    return customerRepository.create(tenantId, {
      phone: input.phone,
      name: input.name ?? null,
      metadata: input.metadata ?? {},
    });
  },
};
