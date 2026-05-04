import type { Request, Response } from "express";
import { logger } from "../../lib/logger.js";
import { authService } from "./auth.service.js";

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const email = typeof req.body?.email === "string" ? req.body.email : "";
      const password = typeof req.body?.password === "string" ? req.body.password : "";
      const tenantName = typeof req.body?.tenantName === "string" ? req.body.tenantName : undefined;
      const result = await authService.register({ email, password, tenantName });
      res.status(201).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message === "INVALID_EMAIL" || message === "INVALID_PASSWORD") {
        res.status(400).json({ error: message });
        return;
      }
      if (message === "EMAIL_ALREADY_USED") {
        res.status(409).json({ error: message });
        return;
      }
      logger.error({ err }, "auth_register_failed");
      res.status(500).json({ error: "Registration failed" });
    }
  },

  async login(req: Request, res: Response): Promise<void> {
    try {
      const email = typeof req.body?.email === "string" ? req.body.email : "";
      const password = typeof req.body?.password === "string" ? req.body.password : "";
      const result = await authService.login({ email, password });
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message === "INVALID_CREDENTIALS") {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }
      if (message === "TENANT_NOT_FOUND") {
        res.status(404).json({ error: "Tenant not found" });
        return;
      }
      logger.error({ err }, "auth_login_failed");
      res.status(500).json({ error: "Login failed" });
    }
  },
};
