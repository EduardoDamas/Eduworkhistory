import type { InboundEvent, InboundEventStatus, Prisma, Source } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export const inboundEventRepository = {
  async create(data: Prisma.InboundEventUncheckedCreateInput): Promise<InboundEvent> {
    return prisma.inboundEvent.create({ data });
  },

  async findByUnique(tenantId: string, source: Source, externalEventId: string): Promise<InboundEvent | null> {
    return prisma.inboundEvent.findUnique({
      where: {
        tenantId_source_externalEventId: { tenantId, source, externalEventId },
      },
    });
  },

  async findByIdForTenant(tenantId: string, id: string): Promise<InboundEvent | null> {
    return prisma.inboundEvent.findFirst({ where: { id, tenantId } });
  },

  async updateById(
    tenantId: string,
    id: string,
    data: Pick<Prisma.InboundEventUpdateInput, "status" | "errorMessage" | "processedAt" | "payload">,
  ): Promise<void> {
    await prisma.inboundEvent.updateMany({
      where: { id, tenantId },
      data,
    });
  },

  async updateStatusUnchecked(
    tenantId: string,
    id: string,
    status: InboundEventStatus,
    patch: { errorMessage?: string | null; processedAt?: Date | null } = {},
  ): Promise<void> {
    const data: Prisma.InboundEventUpdateManyMutationInput = { status };
    if ("errorMessage" in patch) data.errorMessage = patch.errorMessage;
    if ("processedAt" in patch) data.processedAt = patch.processedAt;
    await prisma.inboundEvent.updateMany({
      where: { id, tenantId },
      data,
    });
  },
};
