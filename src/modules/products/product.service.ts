import { Prisma, ProductExternalSource } from "@prisma/client";
import { productRepository } from "../catalog/product.repository.js";

export const productService = {
  async list(tenantId: string) {
    return productRepository.listByTenant(tenantId);
  },

  async getById(tenantId: string, productId: string) {
    const row = await productRepository.findById(tenantId, productId);
    if (!row) throw new Error("PRODUCT_NOT_FOUND");
    return row;
  },

  async patchMapping(
    tenantId: string,
    productId: string,
    input: {
      externalId?: unknown;
      externalSource?: unknown;
      syncMetadata?: unknown;
    },
  ) {
    const hasExternalId = Object.prototype.hasOwnProperty.call(input, "externalId");
    const hasExternalSource = Object.prototype.hasOwnProperty.call(input, "externalSource");
    const hasSyncMetadata = Object.prototype.hasOwnProperty.call(input, "syncMetadata");

    if (!hasExternalId && !hasExternalSource && !hasSyncMetadata) {
      throw new Error("MAPPING_FIELDS_REQUIRED");
    }

    let externalSource: ProductExternalSource | undefined;
    if (hasExternalSource) {
      if (typeof input.externalSource !== "string") throw new Error("INVALID_EXTERNAL_SOURCE");
      if (!(Object.values(ProductExternalSource) as string[]).includes(input.externalSource)) {
        throw new Error("INVALID_EXTERNAL_SOURCE");
      }
      externalSource = input.externalSource as ProductExternalSource;
    }

    const externalId =
      hasExternalId && typeof input.externalId === "string" ? input.externalId.trim() : undefined;
    if (hasExternalId && input.externalId !== null && typeof input.externalId !== "string") {
      throw new Error("INVALID_EXTERNAL_ID");
    }

    if (
      hasSyncMetadata &&
      input.syncMetadata !== null &&
      (typeof input.syncMetadata !== "object" || Array.isArray(input.syncMetadata))
    ) {
      throw new Error("INVALID_SYNC_METADATA");
    }

    return productRepository.updateMapping(tenantId, productId, {
      externalId: hasExternalId ? (externalId || null) : undefined,
      externalSource,
      syncMetadata: hasSyncMetadata
        ? toJsonValue((input.syncMetadata as Record<string, unknown> | null) ?? {})
        : undefined,
    });
  },
};

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value === null ? "null" : value;
  }
  if (Array.isArray(value)) return value.map((v) => toJsonValue(v));
  if (typeof value === "object") {
    const out: Record<string, Prisma.InputJsonValue> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = toJsonValue(v);
    return out;
  }
  return String(value);
}
