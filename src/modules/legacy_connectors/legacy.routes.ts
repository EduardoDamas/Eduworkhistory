import { Router } from "express";
import { legacyController } from "./legacy.controller.js";

export function createLegacyRoutes(): Router {
  const r = Router();
  r.post("/configs", (req, res) => void legacyController.createConfig(req, res));
  r.get("/configs", (req, res) => void legacyController.listConfigs(req, res));
  r.get("/configs/:id/health", (req, res) => void legacyController.configHealth(req, res));
  r.patch("/configs/:id", (req, res) => void legacyController.patchConfig(req, res));

  r.get("/export-attempts", (req, res) => void legacyController.listAttempts(req, res));
  r.get("/export-attempts/:id", (req, res) => void legacyController.getAttempt(req, res));
  r.post("/export-attempts/:id/retry", (req, res) => void legacyController.retryAttempt(req, res));
  return r;
}
