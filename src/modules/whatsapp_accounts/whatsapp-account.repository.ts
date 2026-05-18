import { prisma } from "../../lib/prisma.js";

export const whatsappAccountRepository = {
  async upsertForTenant(
    tenantId: string,
    data: {
      accountSid: string;
      authToken: string;
      whatsappFrom: string;
      sandboxJoinCode?: string | null;
      isActive?: boolean;
    },
  ) {
    return prisma.whatsAppAccount.upsert({
      where: { tenantId },
      update: {
        accountSid: data.accountSid,
        authToken: data.authToken,
        whatsappFrom: data.whatsappFrom,
        sandboxJoinCode: data.sandboxJoinCode ?? null,
        isActive: data.isActive ?? true,
      },
      create: {
        tenantId,
        accountSid: data.accountSid,
        authToken: data.authToken,
        whatsappFrom: data.whatsappFrom,
        sandboxJoinCode: data.sandboxJoinCode ?? null,
        isActive: data.isActive ?? true,
      },
    });
  },

  async listForTenant(tenantId: string) {
    return prisma.whatsAppAccount.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
  },

  async updateById(
    tenantId: string,
    id: string,
    patch: Record<string, unknown>,
  ) {
    const row = await prisma.whatsAppAccount.findFirst({ where: { id, tenantId } });
    if (!row) throw new Error("WHATSAPP_ACCOUNT_NOT_FOUND");
    return prisma.whatsAppAccount.update({
      where: { id },
      data: patch as never,
    });
  },

  async findByIdInTenant(tenantId: string, id: string) {
    return prisma.whatsAppAccount.findFirst({
      where: { id, tenantId },
    });
  },

  async findActiveByTenant(tenantId: string) {
    return prisma.whatsAppAccount.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { updatedAt: "desc" },
    });
  },

  async findActiveByAccountSid(accountSid: string) {
    return prisma.whatsAppAccount.findFirst({
      where: { accountSid, isActive: true },
      include: { tenant: true },
    });
  },

  async findActiveByAccountSidAndWhatsappFrom(accountSid: string, whatsappFrom: string) {
    return prisma.whatsAppAccount.findFirst({
      where: { accountSid, whatsappFrom, isActive: true },
      include: { tenant: true },
    });
  },

  async findActiveByWhatsappFrom(whatsappFrom: string) {
    return prisma.whatsAppAccount.findFirst({
      where: { whatsappFrom, isActive: true },
      include: { tenant: true },
    });
  },
};
