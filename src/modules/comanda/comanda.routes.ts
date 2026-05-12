import { Router } from "express";
import { comandaController } from "./comanda.controller.js";

export function createComandaRoutes(): Router {
  const r = Router();
  r.get("/orders/pending", (req, res) => void comandaController.listPendingOrders(req, res));
  r.get("/orders/:id", (req, res) => void comandaController.getOrder(req, res));
  r.patch("/orders/:id/status", (req, res) => void comandaController.updateOrderStatus(req, res));
  r.patch("/products/:id/availability", (req, res) =>
    void comandaController.updateProductAvailability(req, res),
  );
  r.get("/catalog", (req, res) => void comandaController.listCatalog(req, res));
  r.get("/push-attempts", (req, res) => void comandaController.listPushAttempts(req, res));
  r.post("/push-attempts/:id/retry", (req, res) => void comandaController.retryPushAttempt(req, res));
  return r;
}
