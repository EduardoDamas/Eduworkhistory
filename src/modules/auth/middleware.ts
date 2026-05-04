import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";
import { runWithTenant } from "./tenant-context.js";
import type { TenantContext, TenantContextResolved } from "./types.js";

type RequestWithAuthUser = Request & {
  authUser?: {
    id: string;
    email: string;
    role: UserRole;
    tenantId: string;
  };
};

export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.header("x-api-key");
  if (!apiKey) {
    res.status(401).json({ error: "Missing x-api-key header" });
    return;
  }

  void prisma.tenant
    .findUnique({ where: { apiKey } })
    .then((tenant) => {
      if (!tenant) {
        res.status(401).json({ error: "Invalid API key" });
        return;
      }
      const ctx: TenantContextResolved = {
        id: tenant.id,
        name: tenant.name,
        apiKey: tenant.apiKey,
        resolvedBy: "api_key",
      };
      runWithTenant(ctx, () => next());
    })
    .catch((err: unknown) => {
      logger.error({ err }, "auth_lookup_failed");
      res.status(500).json({ error: "Authentication failed" });
    });
}

export function tenantAuth(req: Request, res: Response, next: NextFunction): void {
  const token = getBearerToken(req);
  if (token) {
    const parsed = parseAuthToken(token);
    if (!parsed) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }
    void prisma.tenantUser
      .findUnique({
        where: {
          userId_tenantId: {
            userId: parsed.userId,
            tenantId: parsed.tenantId,
          },
        },
        include: { tenant: true, user: true },
      })
      .then((membership) => {
        if (!membership?.tenant || !membership.user) {
          res.status(401).json({ error: "Tenant membership not found" });
          return;
        }
        const ctx: TenantContextResolved = {
          id: membership.tenant.id,
          name: membership.tenant.name,
          apiKey: membership.tenant.apiKey,
          resolvedBy: "jwt",
          userId: membership.userId,
          userRole: membership.role,
        };
        (req as RequestWithAuthUser).authUser = {
          id: membership.user.id,
          email: membership.user.email,
          role: membership.role,
          tenantId: membership.tenantId,
        };
        runWithTenant(ctx, () => next());
      })
      .catch((err: unknown) => {
        logger.error({ err }, "tenant_auth_lookup_failed");
        res.status(500).json({ error: "Authentication failed" });
      });
    return;
  }

  const apiKey = req.header("x-api-key");
  if (apiKey) {
    apiKeyAuth(req, res, next);
    return;
  }

  res.status(401).json({ error: "Missing Authorization Bearer token or x-api-key header" });
}

export async function resolveTenantFromApiKey(
  apiKey: string | undefined,
): Promise<TenantContext | null> {
  const key = apiKey?.trim();
  if (!key) return null;
  const tenant = await prisma.tenant.findUnique({ where: { apiKey: key } });
  if (!tenant) return null;
  return { id: tenant.id, name: tenant.name, apiKey: tenant.apiKey };
}

export function getAuthenticatedUser(req: Request): RequestWithAuthUser["authUser"] {
  return (req as RequestWithAuthUser).authUser;
}

function getBearerToken(req: Request): string | null {
  const auth = req.header("authorization");
  if (!auth) return null;
  const [prefix, token] = auth.split(" ");
  if (prefix?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

function parseAuthToken(token: string): { userId: string; tenantId: string; role: string } | null {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const [userId, tenantId, role] = raw.split(":");
    if (!userId || !tenantId || !role) return null;
    return { userId, tenantId, role };
  } catch {
    return null;
  }
}
