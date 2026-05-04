import { Router } from "express";
import { tenantController } from "./tenant.controller.js";

export function createTenantRoutes(): Router {
  const r = Router();
  r.post("/", (req, res) => void tenantController.create(req, res));
  return r;
}

export function createProtectedTenantRoutes(): Router {
  const r = Router();
  r.get("/", (req, res) => void tenantController.listMe(req, res));
  return r;
}
