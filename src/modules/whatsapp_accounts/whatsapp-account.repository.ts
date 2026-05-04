import { prisma } from "../../lib/prisma.js";

export const whatsappAccountRepository = {
  async upsertForTenant(
    tenantId: string,
    data: {
      phoneNumberId: string;
      businessAccountId: string;
      accessToken: string;
      verifyToken: string;
      appSecret?: string | null;
      isActive?: boolean;
    },
  ) {
    return prisma.whatsAppAccount.upsert({
      where: { tenantId },
      update: {
        phoneNumberId: data.phoneNumberId,
        businessAccountId: data.businessAccountId,
        accessToken: data.accessToken,
        verifyToken: data.verifyToken,
        appSecret: data.appSecret ?? null,
        isActive: data.isActive ?? true,
      },
      create: {
        tenantId,
        phoneNumberId: data.phoneNumberId,
        businessAccountId: data.businessAccountId,
        accessToken: data.accessToken,
        verifyToken: data.verifyToken,
        appSecret: data.appSecret ?? null,
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

  async findByVerifyToken(token: string) {
    return prisma.whatsAppAccount.findFirst({
      where: { verifyToken: token, isActive: true },
      include: { tenant: true },
    });
  },

  async findByPhoneNumberId(phoneNumberId: string) {
    return prisma.whatsAppAccount.findFirst({
      where: { phoneNumberId, isActive: true },
      include: { tenant: true },
    });
  },
};
