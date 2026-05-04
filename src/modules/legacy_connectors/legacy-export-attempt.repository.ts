import type { LegacyExportAttemptStatus, LegacyExportSource, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export const legacyExportAttemptRepository = {
  async findByTenantOrderSource(tenantId: string, orderId: string, source: LegacyExportSource) {
    return prisma.legacyExportAttempt.findUnique({
      where: { tenantId_orderId_source: { tenantId, orderId, source } },
    });
  },

  async createOrUpdatePending(input: {
    tenantId: string;
    orderId: string;
    source: LegacyExportSource;
    idempotencyKey: string;
    payload: Prisma.InputJsonValue;
  }) {
    return prisma.legacyExportAttempt.upsert({
      where: { tenantId_orderId_source: { tenantId: input.tenantId, orderId: input.orderId, source: input.source } },
      update: {
        idempotencyKey: input.idempotencyKey,
        payload: input.payload,
        status: "PENDING",
      },
      create: {
        tenantId: input.tenantId,
        orderId: input.orderId,
        source: input.source,
        idempotencyKey: input.idempotencyKey,
        payload: input.payload,
        status: "PENDING",
      },
    });
  },

  async markSuccess(id: string, response: Prisma.InputJsonValue) {
    return prisma.legacyExportAttempt.update({
      where: { id },
      data: {
        status: "SUCCESS",
        attemptCount: { increment: 1 },
        lastError: null,
        providerResponse: response,
      },
    });
  },

  async markFailed(id: string, errorMessage: string, status: LegacyExportAttemptStatus = "FAILED") {
    return prisma.legacyExportAttempt.update({
      where: { id },
      data: {
        status,
        attemptCount: { increment: 1 },
        lastError: errorMessage,
      },
    });
  },

  async markRetrying(id: string, errorMessage: string) {
    return this.markFailed(id, errorMessage, "RETRYING");
  },

  async listByTenant(tenantId: string) {
    return prisma.legacyExportAttempt.findMany({
      where: { tenantId },
      orderBy: { updatedAt: "desc" },
    });
  },

  async findById(tenantId: string, id: string) {
    return prisma.legacyExportAttempt.findFirst({ where: { tenantId, id } });
  },
};
