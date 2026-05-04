import { randomUUID } from "node:crypto";
import type { Tenant } from "@prisma/client";
import { tenantRepository } from "./tenant.repository.js";

export const tenantService = {
  async createTenant(name: string): Promise<Tenant> {
    const apiKey = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
    return tenantRepository.create({ name, apiKey });
  },

  async getCurrentTenant(id: string) {
    return tenantRepository.findById(id);
  },
};
