import { Router } from "express";
import { catalogController } from "./catalog.controller.js";

export function createCatalogRoutes(): Router {
  const r = Router();
  r.get("/", (req, res) => void catalogController.list(req, res));
  return r;
}
