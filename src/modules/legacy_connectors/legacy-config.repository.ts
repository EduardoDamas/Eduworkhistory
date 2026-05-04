import type { Prisma, LegacyConnectionSource } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export const legacyConfigRepository = {
  async upsertConfig(
    tenantId: string,
    source: LegacyConnectionSource,
    data: {
      host: string;
      port: number;
      databaseName: string;
      username: string;
      password: string;
      options?: Prisma.InputJsonValue;
      enabled?: boolean;
      dryRun?: boolean;
    },
  ) {
    return prisma.legacyConnectionConfig.upsert({
      where: { tenantId_source: { tenantId, source } },
      update: {
        host: data.host,
        port: data.port,
        databaseName: data.databaseName,
        username: data.username,
        password: data.password,
        options: data.options ?? {},
        enabled: data.enabled ?? false,
        dryRun: data.dryRun ?? true,
      },
      create: {
        tenantId,
        source,
        host: data.host,
        port: data.port,
        databaseName: data.databaseName,
        username: data.username,
        password: data.password,
        options: data.options ?? {},
        enabled: data.enabled ?? false,
        dryRun: data.dryRun ?? true,
      },
    });
  },

  async listByTenant(tenantId: string) {
    return prisma.legacyConnectionConfig.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
  },

  async findById(tenantId: string, id: string) {
    return prisma.legacyConnectionConfig.findFirst({ where: { tenantId, id } });
  },

  async patchById(
    tenantId: string,
    id: string,
    data: Prisma.LegacyConnectionConfigUpdateInput,
  ) {
    const row = await prisma.legacyConnectionConfig.findFirst({ where: { tenantId, id } });
    if (!row) throw new Error("LEGACY_CONFIG_NOT_FOUND");
    return prisma.legacyConnectionConfig.update({ where: { id }, data });
  },

  async findEnabledByTenantAndSource(tenantId: string, source: LegacyConnectionSource) {
    return prisma.legacyConnectionConfig.findFirst({
      where: { tenantId, source, enabled: true },
      orderBy: { updatedAt: "desc" },
    });
  },
};
