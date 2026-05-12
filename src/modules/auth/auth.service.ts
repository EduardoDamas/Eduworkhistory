import { randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { prisma } from "../../lib/prisma.js";

type AuthResult = {
  user: {
    id: string;
    email: string;
    role: "OWNER" | "ADMIN" | "MODERATOR" | "USER";
  };
  tenant: {
    id: string;
    name: string;
    apiKey: string;
    role: "OWNER" | "ADMIN" | "MODERATOR" | "USER";
  };
  token: string;
};

export const authService = {
  async register(input: { email: string; password: string; tenantName?: string }): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase();
    if (!email || !email.includes("@")) throw new Error("INVALID_EMAIL");
    if (input.password.length < 6) throw new Error("INVALID_PASSWORD");

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new Error("EMAIL_ALREADY_USED");

    const passwordHash = hashPassword(input.password);
    const fallbackName = email.split("@")[0] ? `${email.split("@")[0]} workspace` : "New workspace";
    const tenantName = input.tenantName?.trim() || fallbackName;

    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: "OWNER",
        },
      });

      const tenant = await tx.tenant.create({
        data: {
          name: tenantName,
          apiKey: generateApiKey(),
        },
      });

      const membership = await tx.tenantUser.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          role: "OWNER",
        },
      });

      await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          plan: "FREE",
          status: "TRIAL",
          usageCount: 0,
          currentPeriodStart: now,
          currentPeriodEnd: nextMonth,
        },
      });

      return { user, tenant, membership };
    });

    return {
      user: {
        id: created.user.id,
        email: created.user.email,
        role: created.user.role,
      },
      tenant: {
        id: created.tenant.id,
        name: created.tenant.name,
        apiKey: created.tenant.apiKey,
        role: created.membership.role,
      },
      token: signToken(created.user.id, created.tenant.id, created.membership.role),
    };
  },

  async login(input: { email: string; password: string }): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase();
    if (!email || !email.includes("@")) throw new Error("INVALID_CREDENTIALS");

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error("INVALID_CREDENTIALS");
    if (!verifyPassword(input.password, user.passwordHash)) throw new Error("INVALID_CREDENTIALS");

    const membership = await prisma.tenantUser.findFirst({
      where: { userId: user.id },
      include: { tenant: true },
      orderBy: { createdAt: "asc" },
    });
    if (!membership?.tenant) throw new Error("TENANT_NOT_FOUND");

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      tenant: {
        id: membership.tenant.id,
        name: membership.tenant.name,
        apiKey: membership.tenant.apiKey,
        role: membership.role,
      },
      token: signToken(user.id, membership.tenant.id, membership.role),
    };
  },

  async getUserProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenants: {
          include: { tenant: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!user) throw new Error("USER_NOT_FOUND");

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      tenants: user.tenants.map((membership) => ({
        id: membership.tenant.id,
        name: membership.tenant.name,
        apiKey: membership.tenant.apiKey,
        role: membership.role,
      })),
    };
  },

  async createTenantForUser(input: { userId: string; tenantName: string }) {
    if (!input.tenantName.trim()) throw new Error("TENANT_NAME_REQUIRED");
    const user = await prisma.user.findUnique({ where: { id: input.userId } });
    if (!user) throw new Error("USER_NOT_FOUND");

    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: input.tenantName.trim(),
          apiKey: generateApiKey(),
        },
      });
      await tx.tenantUser.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          role: "OWNER",
        },
      });
      await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          plan: "FREE",
          status: "TRIAL",
          usageCount: 0,
          currentPeriodStart: now,
          currentPeriodEnd: nextMonth,
        },
      });
      return tenant;
    });

    return result;
  },

  async regenerateTenantApiKey(input: { userId: string; tenantId: string }) {
    const membership = await prisma.tenantUser.findUnique({
      where: {
        userId_tenantId: {
          userId: input.userId,
          tenantId: input.tenantId,
        },
      },
    });
    if (!membership) throw new Error("TENANT_ACCESS_DENIED");

    return prisma.tenant.update({
      where: { id: input.tenantId },
      data: { apiKey: generateApiKey() },
    });
  },

  async listTenantUsers(input: { actorUserId: string; tenantId: string }) {
    const actorMembership = await prisma.tenantUser.findUnique({
      where: { userId_tenantId: { userId: input.actorUserId, tenantId: input.tenantId } },
    });
    if (!actorMembership) throw new Error("TENANT_ACCESS_DENIED");
    if (!["OWNER", "ADMIN"].includes(actorMembership.role)) throw new Error("ROLE_FORBIDDEN");

    const rows = await prisma.tenantUser.findMany({
      where: { tenantId: input.tenantId },
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: "asc" },
    });

    return rows.map((row) => ({
      userId: row.userId,
      email: row.user.email,
      role: row.role,
      createdAt: row.createdAt,
    }));
  },

  async updateTenantUserRole(input: {
    actorUserId: string;
    tenantId: string;
    targetUserId: string;
    role: unknown;
  }) {
    const nextRole = parseRoleUpdate(input.role);
    const actorMembership = await prisma.tenantUser.findUnique({
      where: { userId_tenantId: { userId: input.actorUserId, tenantId: input.tenantId } },
    });
    if (!actorMembership) throw new Error("TENANT_ACCESS_DENIED");
    if (actorMembership.role !== "OWNER") throw new Error("ROLE_FORBIDDEN");
    if (input.actorUserId === input.targetUserId) throw new Error("OWNER_SELF_DEMOTION_FORBIDDEN");

    const targetMembership = await prisma.tenantUser.findUnique({
      where: { userId_tenantId: { userId: input.targetUserId, tenantId: input.tenantId } },
    });
    if (!targetMembership) throw new Error("TENANT_USER_NOT_FOUND");

    const updated = await prisma.tenantUser.update({
      where: { userId_tenantId: { userId: input.targetUserId, tenantId: input.tenantId } },
      data: { role: nextRole },
    });

    return {
      success: true as const,
      userId: updated.userId,
      tenantId: updated.tenantId,
      role: updated.role,
    };
  },

  async getTenantBilling(tenantId: string): Promise<{
    plan: string;
    status: string;
    usageCount: number;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    stripeConfigured: boolean;
  }> {
    const sub = await prisma.subscription.findUnique({ where: { tenantId } });
    if (!sub) {
      const now = new Date();
      const end = new Date(now.getTime() + 30 * 86_400_000);
      return {
        plan: "demo",
        status: "ACTIVE",
        usageCount: 0,
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: end.toISOString(),
        stripeConfigured: false,
      };
    }
    return {
      plan: sub.plan,
      status: sub.status,
      usageCount: sub.usageCount,
      currentPeriodStart: sub.currentPeriodStart.toISOString(),
      currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
      stripeConfigured: Boolean(sub.stripeCustomerId && sub.stripeSubscriptionId),
    };
  },
};

function generateApiKey(): string {
  return randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
}

function hashPassword(password: string): string {
  const salt = randomUUID().replace(/-/g, "");
  const digest = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${digest}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, expected] = stored.split(":");
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64).toString("hex");
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(actual, "hex"));
}

function signToken(userId: string, tenantId: string, role: string): string {
  return Buffer.from(`${userId}:${tenantId}:${role}:${Date.now()}`).toString("base64url");
}

function parseRoleUpdate(input: unknown): "ADMIN" | "MODERATOR" | "USER" {
  if (input !== "ADMIN" && input !== "MODERATOR" && input !== "USER") {
    throw new Error("INVALID_ROLE");
  }
  return input;
}
