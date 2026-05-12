import { Router } from "express";
import { integrationsController } from "./integrations.controller.js";

export function createIntegrationRoutes(): Router {
  const router = Router();
  router.get("/health", (req, res) => void integrationsController.health(req, res));
  return router;
}
