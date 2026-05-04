import { Router } from "express";
import { authOnboardingController } from "./auth-onboarding.controller.js";

export function createAuthOnboardingRoutes(): Router {
  const router = Router();
  router.get("/me", (req, res) => void authOnboardingController.me(req, res));
  router.post("/tenants", (req, res) => void authOnboardingController.createTenant(req, res));
  router.post("/tenants/regenerate-api-key", (req, res) => void authOnboardingController.regenerateApiKey(req, res));
  router.get("/tenants/:tenantId/users", (req, res) => void authOnboardingController.listTenantUsers(req, res));
  router.patch("/tenants/:tenantId/users/:userId/role", (req, res) =>
    void authOnboardingController.updateTenantUserRole(req, res),
  );
  return router;
}
