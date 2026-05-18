import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";
import { env } from "../../config/env.js";
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

/**
 * TEMPORARY local-dev only: skip API key / JWT when testing from localhost.
 * Never enabled when NODE_ENV is production.
 */
function isDevAuthBypassEnabled(req: Request): boolean {
  if (env.NODE_ENV === "production") return false;
  if (env.NODE_ENV !== "development") return false;
  if (!env.DEV_AUTH_BYPASS) return false;
  return isLocalhostRequest(req);
}

function isLocalhostRequest(req: Request): boolean {
  const host = (req.hostname ?? "").toLowerCase();
  if (host === "localhost" || host === "127.0.0.1") return true;

  const ip = (req.ip ?? req.socket?.remoteAddress ?? "").toLowerCase();
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip === "::ffff:127.0.0.1" ||
    ip.endsWith("127.0.0.1")
  );
}

async function resolveDevBypassTenant(): Promise<TenantContext | null> {
  const tenantId = env.DEV_TENANT_ID?.trim();
  if (tenantId) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (tenant) return { id: tenant.id, name: tenant.name, apiKey: tenant.apiKey };
  }

  const first = await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
  if (!first) return null;
  return { id: first.id, name: first.name, apiKey: first.apiKey };
}

function applyDevAuthBypass(req: Request, res: Response, next: NextFunction): void {
  void resolveDevBypassTenant()
    .then((tenant) => {
      if (!tenant) {
        res.status(401).json({
          error:
            "Dev auth bypass: no tenant in database. Run seed/migrations or set DEV_TENANT_ID in .env.",
        });
        return;
      }

      const ctx: TenantContextResolved = {
        ...tenant,
        resolvedBy: "dev_bypass",
      };

      logger.warn(
        { tenantId: tenant.id, method: req.method, path: req.path },
        "dev_auth_bypass_used",
      );

      runWithTenant(ctx, () => next());
    })
    .catch((err: unknown) => {
      logger.error({ err }, "dev_auth_bypass_failed");
      res.status(500).json({ error: "Authentication failed" });
    });
}

export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.header("x-api-key");
  if (!apiKey) {
    if (isDevAuthBypassEnabled(req)) {
      applyDevAuthBypass(req, res, next);
      return;
    }
    res.status(401).json({ error: "Missing x-api-key header" });
    return;
  }

  void prisma.tenant
    .findUnique({ where: { apiKey } })
    .then((tenant) => {
      if (!tenant) {
        if (isDevAuthBypassEnabled(req)) {
          applyDevAuthBypass(req, res, next);
          return;
        }
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

  if (isDevAuthBypassEnabled(req)) {
    applyDevAuthBypass(req, res, next);
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
