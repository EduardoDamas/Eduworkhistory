import type { Prisma, WaMessageDirection } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export const whatsappMessageRepository = {
  async create(
    tenantId: string,
    data: {
      phone: string;
      direction: WaMessageDirection;
      messageText: string;
      rawPayload: Prisma.InputJsonValue;
    },
  ) {
    return prisma.whatsAppMessage.create({
      data: {
        tenantId,
        phone: data.phone,
        direction: data.direction,
        messageText: data.messageText,
        rawPayload: data.rawPayload,
      },
    });
  },

  async updateRawPayload(
    tenantId: string,
    id: string,
    rawPayload: Prisma.InputJsonValue,
  ): Promise<void> {
    await prisma.whatsAppMessage.updateMany({
      where: { id, tenantId },
      data: { rawPayload },
    });
  },
};
