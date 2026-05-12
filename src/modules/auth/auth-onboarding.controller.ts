import type { Request, Response } from "express";
import { logger } from "../../lib/logger.js";
import { authService } from "./auth.service.js";
import { getAuthenticatedUser } from "./middleware.js";
import { getTenant } from "./tenant-context.js";

export const authOnboardingController = {
  async me(req: Request, res: Response): Promise<void> {
    try {
      const authUser = getAuthenticatedUser(req);
      if (!authUser) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const profile = await authService.getUserProfile(authUser.id);
      res.json(profile);
    } catch (err) {
      logger.error({ err }, "auth_me_failed");
      res.status(500).json({ error: "Failed to load user profile" });
    }
  },

  async createTenant(req: Request, res: Response): Promise<void> {
    try {
      const authUser = getAuthenticatedUser(req);
      if (!authUser) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const tenantName = typeof req.body?.name === "string" ? req.body.name.trim() : "";
      if (!tenantName) {
        res.status(400).json({ error: "name is required" });
        return;
      }
      const tenant = await authService.createTenantForUser({ userId: authUser.id, tenantName });
      const token = Buffer.from(`${authUser.id}:${tenant.id}:OWNER:${Date.now()}`).toString("base64url");
      res.status(201).json({
        tenant: {
          id: tenant.id,
          name: tenant.name,
          apiKey: tenant.apiKey,
          role: "OWNER",
        },
        token,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message === "TENANT_NAME_REQUIRED") {
        res.status(400).json({ error: message });
        return;
      }
      logger.error({ err }, "auth_create_tenant_failed");
      res.status(500).json({ error: "Failed to create tenant" });
    }
  },

  async regenerateApiKey(req: Request, res: Response): Promise<void> {
    try {
      const authUser = getAuthenticatedUser(req);
      if (!authUser) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const tenantId = typeof req.body?.tenantId === "string" ? req.body.tenantId : authUser.tenantId;
      const tenant = await authService.regenerateTenantApiKey({ userId: authUser.id, tenantId });
      res.json({ tenantId: tenant.id, apiKey: tenant.apiKey });
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message === "TENANT_ACCESS_DENIED") {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      logger.error({ err }, "auth_regenerate_api_key_failed");
      res.status(500).json({ error: "Failed to regenerate api key" });
    }
  },

  async listTenantUsers(req: Request, res: Response): Promise<void> {
    try {
      const authUser = getAuthenticatedUser(req);
      if (!authUser) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const tenantId = typeof req.params.tenantId === "string" ? req.params.tenantId : "";
      if (!tenantId || tenantId !== authUser.tenantId) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const rows = await authService.listTenantUsers({ actorUserId: authUser.id, tenantId });
      res.json(rows);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message === "TENANT_ACCESS_DENIED" || message === "ROLE_FORBIDDEN") {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      logger.error({ err }, "auth_list_tenant_users_failed");
      res.status(500).json({ error: "Failed to list tenant users" });
    }
  },

  async updateTenantUserRole(req: Request, res: Response): Promise<void> {
    try {
      const authUser = getAuthenticatedUser(req);
      if (!authUser) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const tenantId = typeof req.params.tenantId === "string" ? req.params.tenantId : "";
      const userId = typeof req.params.userId === "string" ? req.params.userId : "";
      const role = (req.body as { role?: unknown } | undefined)?.role;
      if (!tenantId || !userId || tenantId !== authUser.tenantId) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const result = await authService.updateTenantUserRole({
        actorUserId: authUser.id,
        tenantId,
        targetUserId: userId,
        role,
      });
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message === "INVALID_ROLE" || message === "OWNER_SELF_DEMOTION_FORBIDDEN") {
        res.status(400).json({ error: message });
        return;
      }
      if (message === "TENANT_USER_NOT_FOUND") {
        res.status(404).json({ error: "Tenant user not found" });
        return;
      }
      if (message === "TENANT_ACCESS_DENIED" || message === "ROLE_FORBIDDEN") {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      logger.error({ err }, "auth_update_tenant_user_role_failed");
      res.status(500).json({ error: "Failed to update tenant user role" });
    }
  },

  async billing(_req: Request, res: Response): Promise<void> {
    try {
      const { id: tenantId } = getTenant();
      const payload = await authService.getTenantBilling(tenantId);
      res.json(payload);
    } catch (err) {
      logger.error({ err }, "saas_billing_failed");
      res.status(500).json({ error: "Failed to load billing" });
    }
  },
};
