import { Router } from "express";
import { productController } from "./product.controller.js";

export function createProductRoutes(): Router {
  const r = Router();
  r.get("/", (req, res) => void productController.list(req, res));
  r.get("/:id", (req, res) => void productController.getById(req, res));
  r.patch("/:id/mapping", (req, res) => void productController.patchMapping(req, res));
  return r;
}
