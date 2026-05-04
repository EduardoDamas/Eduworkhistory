import { Router } from "express";
import { orderController } from "./order.controller.js";

export function createOrderRoutes(): Router {
  const r = Router();

  r.get("/pending-confirmation", (req, res) => void orderController.listPendingConfirmation(req, res));
  r.patch("/:id/accept", (req, res) => void orderController.transition(req, res, "accept"));
  r.patch("/:id/reject", (req, res) => void orderController.transition(req, res, "reject"));
  r.patch("/:id/ready", (req, res) => void orderController.transition(req, res, "ready"));
  r.patch("/:id/delivering", (req, res) => void orderController.transition(req, res, "delivering"));
  r.patch("/:id/delivered", (req, res) => void orderController.transition(req, res, "delivered"));
  r.patch("/:id/confirm", (req, res) => void orderController.confirm(req, res));
  r.get("/", (req, res) => void orderController.list(req, res));
  r.post("/", (req, res) => void orderController.create(req, res));

  return r;
}
