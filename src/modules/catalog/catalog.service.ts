import { productRepository } from "./product.repository.js";

export const catalogService = {
  async listForTenant(tenantId: string) {
    await productRepository.seedDemoCatalogIfEmpty(tenantId);
    return productRepository.listActiveByTenant(tenantId);
  },
};
