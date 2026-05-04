import type { Prisma, WhatsAppConversationState } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export const whatsappConversationRepository = {
  async findByTenantPhone(tenantId: string, phone: string) {
    return prisma.whatsAppConversation.findUnique({
      where: { tenantId_phone: { tenantId, phone } },
    });
  },

  async create(data: Prisma.WhatsAppConversationUncheckedCreateInput) {
    return prisma.whatsAppConversation.create({ data });
  },

  /** Single-row update by id (tenant verified first). */
  async updateById(
    tenantId: string,
    id: string,
    data: Prisma.WhatsAppConversationUpdateInput,
  ) {
    const row = await prisma.whatsAppConversation.findFirst({ where: { id, tenantId } });
    if (!row) throw new Error("WHATSAPP_CONVERSATION_NOT_FOUND");
    return prisma.whatsAppConversation.update({
      where: { id },
      data,
    });
  },

  async updateState(
    tenantId: string,
    id: string,
    patch: { state?: WhatsAppConversationState; address?: string | null },
  ) {
    const data: Prisma.WhatsAppConversationUpdateManyMutationInput = {};
    if (patch.state !== undefined) data.state = patch.state;
    if (patch.address !== undefined) data.address = patch.address;
    if (Object.keys(data).length === 0) return { count: 0 };
    return prisma.whatsAppConversation.updateMany({
      where: { id, tenantId },
      data,
    });
  },
};
